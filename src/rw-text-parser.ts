import { Node, ParsedNode } from '@prostojs/parser'
import { stringExpressionNodeFactory } from './string-expression'
import {
    TRewriteCodeFactory,
    TRewriteNodeType,
    TRewriteTextOptions,
} from './types'
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
        code: (node) => `for ${node.data.expression} {\n`,
    },
    {
        key: 'IF',
        exprRequired: true,
        opening: true,
        code: (node) => `if ${node.data.expression} {\n`,
    },
    {
        key: 'ELSEIF',
        closingKey: 'IF',
        exprRequired: true,
        opening: false,
        overtakes: ['IF', 'ELSEIF'],
        code: (node) => `} else if ${node.data.expression} {\n`,
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

const textBlockTypesO: Record<TTextBlockOperations, TTextBlockDescr> =
    {} as Record<TTextBlockOperations, TTextBlockDescr>
textBlockTypes.forEach((b) => (textBlockTypesO[b.key] = b))

interface TTextBlockCustomData extends TRewriteNodeType<TTextBlockCustomData> {
    block: string
    expression: string
    rest: string
    descr: TTextBlockDescr
    endBlock: string
    endExpression: string
    endRest: string
}

export const getTextParser = (
    opts: TRewriteTextOptions,
    recognizeHtmlDirective = false,
) => {
    const rootNode = new Node({ name: 'text-root', eofClose: true })
    const stringExpressionNode = stringExpressionNodeFactory(
        opts.exprDelimiters,
    )

    const esc = escapeRegex(opts.blockOperation)

    // Start pattern - includes trailing \n, excludes END* blocks
    const blockStartPattern = new RegExp(
        `^\\s*(?:\\/\\/|#)${esc}\\s*(?<block>(?!END)\\w+[^\\S\\r\\n]*\\w*)[^\\S\\r\\n]*(?<expression>\\(.*\\))?(?<rest>[^\\n]*)?$\\n?`,
        'm',
    )
    // END pattern - includes trailing \n
    const blockEndPattern = new RegExp(
        `^\\s*(?:\\/\\/|#)${esc}\\s*(?<endBlock>END[^\\S\\r\\n]*\\w*)[^\\S\\r\\n]*(?<endExpression>\\(.*\\))?(?<endRest>[^\\n]*)?$\\n?`,
        'm',
    )
    // Overtake pattern (ELSE/ELSEIF) - ejects so the text is re-matched as start
    const blockOvertakePattern = new RegExp(
        `^\\s*(?:\\/\\/|#)${esc}\\s*(?:ELSE\\s*IF|ELSE)[^\\S\\r\\n]*(?:\\(.*\\))?[^\\n]*$`,
        'm',
    )

    const blockOperationNode = new Node<TTextBlockCustomData>({
        name: 'block-operation',
        // Dynamic wrapper ensures this goes to dynamics array (not statics),
        // so the overtake end token (also dynamic) gets checked first
        start: { token: () => blockStartPattern, omit: true },
        end: [
            { token: blockEndPattern, omit: true },
            {
                token: (ctx) => {
                    // Only IF/ELSEIF blocks can be overtaken by ELSE/ELSEIF
                    const block = ctx.node.data.block?.replace(/[\s\n]/g, '')
                    if (block === 'IF' || block === 'ELSEIF') {
                        return blockOvertakePattern
                    }
                    return /\b\B/
                },
                eject: true,
            },
        ],
        eofClose: true,
        data: {
            block: '',
            expression: '',
            rest: '',
            descr: null as unknown as TTextBlockDescr,
            endBlock: '',
            endExpression: '',
            endRest: '',
            code: () => '',
            openCode: '',
            closeCode: '',
        },
    })
        .onOpen((node) => {
            const block = node.data.block.replace(/[\s\n]/g, '')
            const { expression, rest } = node.data
            const descr = textBlockTypesO[block as TTextBlockOperations]

            if (!descr) {
                throw new Error(
                    `Unknown block operation "${block.trim()}".`,
                )
            }
            if (descr.exprRequired && !expression) {
                throw new Error(
                    `Expression required for "${block.trim()}" operation.`,
                )
            }
            if (!descr.exprRequired && !!expression) {
                throw new Error(
                    `Unexpected expression for "${block.trim()}" operation.`,
                )
            }
            if (rest) {
                throw new Error(
                    `Unexpected text "${rest}" in "${block.trim()}" operation.`,
                )
            }

            if (!descr.opening) {
                // Non-opening block (ELSE, ELSEIF) - check previous sibling
                const parentContent = node.parent?.content
                if (parentContent) {
                    let prevSiblingNode: ParsedNode | null = null
                    for (let j = parentContent.length - 1; j >= 0; j--) {
                        const item = parentContent[j]
                        if (typeof item === 'string') {
                            if (item.replace(/[\s\n\r]/g, '')) {
                                throw new Error(
                                    `Unexpected block operation "${block.trim()}".`,
                                )
                            }
                        } else {
                            prevSiblingNode = item
                            break
                        }
                    }
                    if (
                        !prevSiblingNode ||
                        !descr.overtakes?.includes(
                            (prevSiblingNode.data as TTextBlockCustomData)
                                .block,
                        )
                    ) {
                        throw new Error(
                            `Unexpected block operation "${block.trim()}".`,
                        )
                    }
                    // Clear previous block's closeCode
                    ;(prevSiblingNode.data as TTextBlockCustomData).closeCode =
                        ''
                } else {
                    throw new Error(
                        `Unexpected block operation "${block.trim()}".`,
                    )
                }
            }

            node.data.block = block
            node.data.descr = descr
            node.data.openCode = descr.code(node)
        })
        .onClose((node, match) => {
            if (match?.groups?.endBlock) {
                const endBlock = match.groups.endBlock.replace(/[\s\n]/g, '')
                const endKey = 'END' + (node.data.descr.closingKey || node.data.descr.key)
                if (endKey !== endBlock) {
                    throw new Error(
                        'Wrong closing block instruction ' + match.groups.endBlock,
                    )
                }
            }
            node.data.closeCode = '}\n'
        })

    const revealNode = new Node({
        name: 'reveal',
        start: {
            token: new RegExp(
                `^\\s*(?:\\/\\/|#)${escapeRegex(opts.revealLine)}[^\\S\\r\\n]*`,
                'm',
            ),
            omit: true,
        },
        end: { token: /$/m },
        eofClose: true,
        recognizes: [stringExpressionNode],
    })

    const ignoreDirectiveNode = new Node({
        name: 'ignore-directive',
        start: {
            token: new RegExp(
                `^\\s*(?:\\/\\/|#)${escapeRegex(opts.directive)}\\s*ignore-next-line\\s*$\\n?`,
                'm',
            ),
            omit: true,
        },
        end: { token: /^[^\n]*$/m },
        eofClose: true,
    })

    const htmlDirectiveNode = new Node({
        name: 'html-directive',
        start: {
            token: new RegExp(
                `^\\s*(?:\\/\\/|#)${escapeRegex(opts.directive)}\\s*html-mode-on\\s*$\\n?`,
                'm',
            ),
            omit: true,
        },
        end: {
            token: new RegExp(
                `^\\s*(?:\\/\\/|#)${escapeRegex(opts.directive)}\\s*html-mode-off\\s*$\\n?`,
                'm',
            ),
            omit: true,
        },
    })

    blockOperationNode.recognize(
        ignoreDirectiveNode,
        blockOperationNode,
        revealNode,
        stringExpressionNode,
    )
    rootNode.recognize(
        ignoreDirectiveNode,
        blockOperationNode,
        revealNode,
        stringExpressionNode,
    )

    if (recognizeHtmlDirective) {
        rootNode.recognize(htmlDirectiveNode)
        blockOperationNode.recognize(htmlDirectiveNode)
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
