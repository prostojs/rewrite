import { BasicNode } from '@prostojs/parser'
import { stringExpressionNodeFactory } from './string-expression'
import { TRewriteCodeFactory, TRewriteNodeType } from './types'
import { getParser } from './rw-common'

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

export const getTextParser = () => {
    const rootNode = new BasicNode({})
    const stringExpressionNode = stringExpressionNodeFactory(['{{', '}}'])

    const blockOperationNode = new BasicNode<TTextBlockCustomData>({
        label: '',
        icon: '↳',
        tokens: [
            /^\s*(?:\/\/|#)=\s*(?<block>\w+[^\S\r\n]*\w*)[^\S\r\n]*(?<expression>\(.*\))?(?<rest>[^\n]*)?$/m,
            /^\s*(?:\/\/|#)=\s*(?<endBlock>END[^\S\r\n]*\w*)[^\S\r\n]*(?<endExpression>\(.*\))?(?<endRest>[^\n]*)?$/m,
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
        .onMatch(({ customData, context }) => {
            customData.block = customData.block.replace(/[\s\n]/g, '')
            customData.descr = textBlockTypesO[customData.block as TTextBlockOperations]
            customData.openCode = customData.descr.code(context)
        })
        .onMatchEndToken(({ customData, matched, parserContext }) => {
            const { endBlock } = (matched as RegExpExecArray).groups as unknown as TTextBlockCustomData
            const endKey = 'END' + (customData.descr.closingKey || customData.descr.key)
            if (endKey !== endBlock.replace(/[\s\n]/g, '')) {
                parserContext.panic('Wrong closing block instruction ' + endBlock, matched[0].length)
            }
            customData.closeCode = '}\n'
            return true
        })
    blockOperationNode.addRecognizes(blockOperationNode, stringExpressionNode)
    rootNode.addRecognizes(stringExpressionNode, blockOperationNode)

    return getParser(rootNode)
}
