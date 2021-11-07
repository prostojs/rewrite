import { BasicNode } from '@prostojs/parser'
import { stringExpressionNodeFactory } from './string-expression'
import { TRewriteCodeFactory, TRewriteNodeType, TRewriteTextOptions } from './types'
import { getRewriter } from './rw-common'
import { escapeRegex } from './utils'

interface TTextBlockDescr {
    key: TTextBlockOperations
    exprRequired?: boolean
    opening?: boolean
    overtakes?: string[]
    closingKey?: string
    code: TRewriteCodeFactory<TTextBlockCustomData>
}

type TTextBlockOperations = 'IF' | 'FOR' | 'ELSE' | 'ELSEIF'

const textBlockTypes: TTextBlockDescr[] = [
    {
        key: 'FOR',
        exprRequired: true,
        opening: true,
        code: ({ customData }) => `for ${ customData.expression } {\n`,
    },
    {
        key: 'IF',
        exprRequired: true,
        opening: true,
        code: ({ customData }) => `if ${ customData.expression } {\n`,
    },
    {
        key: 'ELSEIF',
        closingKey: 'IF',
        exprRequired: true,
        opening: false,
        overtakes: ['IF', 'ELSEIF'],
        code: ({ customData }) => `} else if ${ customData.expression } {\n`,
    },
    {
        key: 'ELSE',
        closingKey: 'IF',
        exprRequired: false,
        opening: false,
        overtakes: ['IF', 'ELSEIF'],
        code: () => '} else {\n',
    },
]

const textBlockTypesO: Record<TTextBlockOperations, TTextBlockDescr> = {} as Record<TTextBlockOperations, TTextBlockDescr>
textBlockTypes.forEach(b => textBlockTypesO[b.key] = b)

interface TTextBlockCustomData extends TRewriteNodeType<TTextBlockCustomData> {
    block: string
    expression: string
    rest: string
    descr: TTextBlockDescr
    endBlock: string
    endExpression: string
    endRest: string
}

export const getTextParser = (opts: TRewriteTextOptions, recognizeHtmlDirective = false) => {
    const rootNode = new BasicNode({ icon: 'Text Mode' })
    const stringExpressionNode = stringExpressionNodeFactory(opts.exprDelimeters)

    const blockOperationNode = new BasicNode<TTextBlockCustomData>({
        label: '',
        icon: '↳',
        tokens: [
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.blockOperation) }\\s*(?<block>\\w+[^\\S\\r\\n]*\\w*)[^\\S\\r\\n]*(?<expression>\\(.*\\))?(?<rest>[^\\n]*)?$`, 'm'),
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.blockOperation) }\\s*(?<endBlock>END[^\\S\\r\\n]*\\w*)[^\\S\\r\\n]*(?<endExpression>\\(.*\\))?(?<endRest>[^\\n]*)?$`, 'm'),
        ],
        tokenOE: 'omit-omit',
    })
        .onMatchStartToken(({ customData, parserContext, matched }) => {
            const { block, expression, rest } = (matched as RegExpExecArray).groups as unknown as TTextBlockCustomData
            const descr = textBlockTypesO[block.replace(/[\s\n]/g, '') as TTextBlockOperations]
            if (!descr) {
                parserContext.panic(`Unknown block operation "${ block.trim() }".`, -matched[0].indexOf(block))
            }
            if (descr.exprRequired && !expression) {
                parserContext.panic(`Expression required for "${ block.trim() }" operation.`, -matched[0].length)
            }
            if (!descr.exprRequired && !!expression) {
                parserContext.panic(`Unexpected expression for "${ block.trim() }" operation.`, -matched[0].indexOf(expression))
            }
            if (rest) {
                parserContext.panic(`Unexpected text "${ rest }" in "${ block.trim() }" operation.`, -matched[0].length + rest.length)
            }
            if (descr.opening) {
                return true
            }
            if (descr.overtakes && descr.overtakes.includes(customData.block)) {
                parserContext.pop()
                return true
            }
            if (customData.block) {
                parserContext.panic(`Unexpected block operation "${ block.trim() }" after "${ customData.block }" block.`)
            } else {
                parserContext.panic(`Unexpected block operation "${ block.trim() }".`)
            }
        })
        .onMatch(({ customData, context, parserContext }) => {
            customData.block = customData.block.replace(/[\s\n]/g, '')
            customData.descr = textBlockTypesO[customData.block as TTextBlockOperations]
            customData.openCode = customData.descr.code(context)
            parserContext.jump()  // eating the new line
        })
        .onPop(({ parserContext }) => parserContext.jump())  // eating the new line
        .onMatchEndToken(({ customData, matched, parserContext }) => {
            const { endBlock } = (matched as RegExpExecArray).groups as unknown as TTextBlockCustomData
            const endKey = 'END' + (customData.descr.closingKey || customData.descr.key)
            if (endKey !== endBlock.replace(/[\s\n]/g, '')) {
                parserContext.panic('Wrong closing block instruction ' + endBlock, matched[0].length)
            }
            customData.closeCode = '}\n'
            return true
        })
        .popsAtEOFSource(true)

    const revealNode = new BasicNode({
        icon: ':',
        tokens: [
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.revealLine) }[^\\S\\r\\n]*`, 'm'),
            /$/m,
        ],
        tokenOE: 'omit-',
    })
        .addRecognizes(stringExpressionNode)
        .popsAtEOFSource(true)

    const ignoreDirectiveNode = new BasicNode({
        icon: ':',
        tokens: [
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.directive) }\\s*ignore-next-line\\s*$`, 'm'),
            /^[^\n]*$/m,
        ],
        tokenOE: 'omit-',
    })
        .popsAtEOFSource(true)

    const htmlDirectiveNode = new BasicNode({
        icon: 'H',
        tokens: [
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.directive) }\\s*html-mode-on\\s*$`, 'm'),
            new RegExp(`^\\s*(?:\\/\\/|#)${ escapeRegex(opts.directive) }\\s*html-mode-off\\s*$`, 'm'),
        ],
        tokenOE: 'omit-omit',
    })
        .onMatch(({ parserContext }) => parserContext.jump())  // eating the new line
        .onPop(({ parserContext }) => parserContext.jump())  // eating the new line

    blockOperationNode.addRecognizes(ignoreDirectiveNode, blockOperationNode, revealNode, stringExpressionNode)
    rootNode.addRecognizes(ignoreDirectiveNode, blockOperationNode, revealNode, stringExpressionNode)

    if (recognizeHtmlDirective) {
        rootNode.addRecognizes(htmlDirectiveNode)
        blockOperationNode.addRecognizes(htmlDirectiveNode)
    }

    return {
        stringExpressionNode,
        revealNode,
        ignoreDirectiveNode,
        blockOperationNode,
        rootNode,
        htmlDirectiveNode,
    }
}

export const getTextRewriter = (opts: TRewriteTextOptions, debug = false) => {
    return getRewriter(getTextParser(opts).rootNode, debug)
}
