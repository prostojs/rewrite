import { Node, textContent, ParsedNode } from '@prostojs/parser'
import { getRewriter, pushString } from './rw-common'
import { stringExpressionNodeFactory } from './string-expression'
import {
    TAttrNodeCustomData,
    THTMLBlockDescr,
    THTMLBlockOperations,
    TRewriteCodeFactory,
    TRewriteHtmlOptions,
    TTagNodeCustomData,
    TValueNodeCustomData,
} from './types'
import { escapeRegex } from './utils'

const htmlBlockTypes: THTMLBlockDescr[] = [
    {
        key: 'for',
        exprRequired: true,
        compatible: ['if'],
        opening: true,
        renderOpen: (v?: string) => `for (${v || ''}) {\n`,
    },
    {
        key: 'if',
        exprRequired: true,
        compatible: ['for'],
        opening: true,
        renderOpen: (v?: string) => `if (${v || ''}) {\n`,
    },
    {
        key: 'else-if',
        closingKey: 'IF',
        exprRequired: true,
        opening: false,
        overtakes: ['if', 'else-if'],
        renderOpen: (v?: string) => `} else if (${v || ''}) {\n`,
    },
    {
        key: 'else',
        closingKey: 'IF',
        exprRequired: false,
        opening: false,
        overtakes: ['if', 'else-if'],
        renderOpen: () => '} else {\n',
    },
]

const htmlBlockTypesO: Record<THTMLBlockOperations, THTMLBlockDescr> =
    {} as Record<THTMLBlockOperations, THTMLBlockDescr>
htmlBlockTypes.forEach((b) => (htmlBlockTypesO[b.key] = b))

export const getHtmlParser = (
    opts: TRewriteHtmlOptions,
    recognizeTextDirective = false,
) => {
    const stringExpressionNode = stringExpressionNodeFactory(
        opts.exprDelimiters,
    )

    const docTypeNode = new Node({
        name: 'doctype',
        start: '<!DOCTYPE ',
        end: '>',
    })

    const cDataNode = new Node({
        name: 'cdata',
        start: '<![CDATA[',
        end: ']]>',
        recognizes: [stringExpressionNode],
    })

    const commentNode = new Node({
        name: 'comment',
        start: '<!--',
        end: '-->',
        recognizes: [stringExpressionNode],
    })

    const attrNode = attributeNodeFactory()
    const attrBlockOperationNode = attributeNodeFactory(
        '↳',
        opts.blockOperation,
        'block',
    )
    const attrExprNode = attributeNodeFactory('≈', opts.attrExpression, 'expr')
    const attrNodes = [attrBlockOperationNode, attrExprNode, attrNode]

    const textDirectiveNode = new Node({
        name: 'text-directive',
        start: {
            token: new RegExp(
                `^\\s*(?:<!--)${escapeRegex(opts.directive)}\\s*text-mode-on\\s*-->\\s*$\\n?`,
                'm',
            ),
            omit: true,
        },
        end: {
            token: new RegExp(
                `^\\s*(?:<!--)${escapeRegex(opts.directive)}\\s*text-mode-off\\s*-->\\s*$\\n?`,
                'm',
            ),
            omit: true,
        },
    })

    // Inner node for regular tags: between > and </
    // Uses dynamic start token to only match for non-text, non-void tags
    const innerNode = new Node({
        name: 'inner',
        start: {
            token: (ctx) => {
                const parentData = ctx.parent?.data as TTagNodeCustomData | undefined
                if (parentData?.isText || parentData?.isVoid) return /\b\B/
                return '>'
            },
        },
        end: { token: '</', eject: true },
        recognizes: [commentNode, cDataNode, stringExpressionNode],
    })

    // Text inner node for text tags (script, style) - no child recognition
    const textInnerNode = new Node({
        name: 'textInner',
        start: {
            token: (ctx) => {
                const parentData = ctx.parent?.data as TTagNodeCustomData | undefined
                if (parentData?.isText) return '>'
                return /\b\B/
            },
        },
        end: { token: '</', eject: true },
    })

    const tagNode = new Node<TTagNodeCustomData>({
        name: 'tag',
        start: { token: /<(?<tag>[\w:\-.]+)/ },
        end: {
            token: (ctx) => {
                const data = ctx.node.data
                if (data.isVoid) return /\/?>\s*/
                if (data.isText)
                    return new RegExp(
                        `\\s*<\\/(?<endTag>${escapeRegex(data.tag)})\\s*>\\s*`,
                    )
                return /(?:\/>|<\/(?<endTag>[\w:\-.]+)\s*>\s*)/
            },
        },
        data: {
            tag: '',
            code: () => '',
        },
        recognizes: [
            ...attrNodes,
        ],
    })
        .onOpen((node) => {
            node.data.isVoid = opts.voidTags.includes(node.data.tag)
            node.data.isText = opts.textTags.includes(node.data.tag)
        })
        .onChild((child, parent) => {
            // Hoist block operation data
            if (child.node === attrBlockOperationNode) {
                if (!parent.data.operations) parent.data.operations = []
                parent.data.operations.push(child.data)
            }
        })
        .onClose((node) => {
            const { isVoid, tag, endTag, operations } = node.data
            let ops = operations
            if (ops && ops.length) {
                ops = ops.sort((a) => (a.key === 'for' ? -1 : 1))
                node.data.operation = ops[0].key as THTMLBlockOperations
                for (let i = 0; i < ops.length; i++) {
                    const { key, value } = ops[i]
                    const descr =
                        htmlBlockTypesO[key as THTMLBlockOperations]
                    if (!descr) {
                        throw new Error(
                            `Unknown block operation "${key}".`,
                        )
                    }
                    if (descr.exprRequired && !value) {
                        throw new Error(
                            `Expression required for "${key}" operation.`,
                        )
                    }
                    if (!descr.exprRequired && !!value) {
                        throw new Error(
                            `Unexpected expression for "${key}" operation.`,
                        )
                    }
                    if (descr.overtakes) {
                        // Check previous sibling in parent
                        // Node may not be in parent.content yet during onClose
                        const parentContent = node.parent?.content
                        if (parentContent) {
                            let prevSibling: ParsedNode | null = null
                            for (let j = parentContent.length - 1; j >= 0; j--) {
                                const item = parentContent[j]
                                if (item === node) continue
                                if (typeof item === 'string') {
                                    if (item.replace(/[\s\n\r]/g, '')) {
                                        throw new Error(
                                            `Unexpected block operation "${descr.key}".`,
                                        )
                                    }
                                } else {
                                    prevSibling = item
                                    break
                                }
                            }
                            if (
                                !prevSibling ||
                                !descr.overtakes.includes(
                                    (prevSibling.data as TTagNodeCustomData)
                                        .operation as THTMLBlockOperations,
                                )
                            ) {
                                throw new Error(
                                    `Unexpected block operation "${descr.key}".`,
                                )
                            }
                            const prevData = prevSibling.data as TTagNodeCustomData
                            prevData.closeCode = ''
                        }
                    }
                }
                if (ops.length === 1) {
                    const descr =
                        htmlBlockTypesO[ops[0].key as THTMLBlockOperations]
                    node.data.openCode = descr.renderOpen(ops[0].value)
                    node.data.closeCode = '}\n'
                } else if (ops.length === 2) {
                    const descr1 =
                        htmlBlockTypesO[ops[0].key as THTMLBlockOperations]
                    const descr2 =
                        htmlBlockTypesO[ops[1].key as THTMLBlockOperations]
                    if (
                        !descr1.compatible?.includes(descr2.key) ||
                        !descr2.compatible?.includes(descr1.key)
                    ) {
                        throw new Error(
                            `Block operation "${descr1.key}" is not compatible with "${descr2.key}".`,
                        )
                    }
                    node.data.openCode =
                        descr1.renderOpen(ops[0].value) +
                        descr2.renderOpen(ops[1].value)
                    node.data.closeCode = '}\n}\n'
                } else {
                    throw new Error(
                        `Too many block operations "${ops.map((o) => o.key).join(', ')}".`,
                    )
                }
            }
            if (!isVoid && typeof endTag === 'string' && tag !== endTag) {
                throw new Error(
                    `Open tag <${tag}> and closing tag </${endTag}> must be equal.`,
                )
            }
        })

    // Add inner nodes to tag's recognizes
    tagNode.recognize(textInnerNode, innerNode)

    // Add tag node to inner node's recognizes (for nested tags)
    innerNode.recognize(tagNode)

    if (recognizeTextDirective) {
        innerNode.recognize(textDirectiveNode)
        cDataNode.recognize(textDirectiveNode)
        textInnerNode.recognize(textDirectiveNode)
    }

    const rootNode = new Node({
        name: 'html-root',
        eofClose: true,
        recognizes: [
            docTypeNode,
            commentNode,
            tagNode,
            stringExpressionNode,
        ],
    })

    if (recognizeTextDirective) {
        rootNode.recognize(textDirectiveNode)
    }

    return {
        rootNode,
        innerNode,
        commentNode,
        cDataNode,
        docTypeNode,
        stringExpressionNode,
        attrNode,
        attrBlockOperationNode,
        attrExprNode,
        tagNode,
        textDirectiveNode,
    }
}

export const getHtmlRewriter = (opts: TRewriteHtmlOptions, debug = false) => {
    return getRewriter(getHtmlParser(opts).rootNode, debug)
}

const quoteEndRegex: Record<string, RegExp> = {
    '"': /(?<=(?<!\\)(?:\\\\)*)"/ ,
    "'": /(?<=(?<!\\)(?:\\\\)*)'/,
    '`': /(?<=(?<!\\)(?:\\\\)*)`/,
}

const quoteReplaceRegex: Record<string, RegExp> = {
    '"': /"/g,
    "'": /'/g,
}

function attributeNodeFactory(
    icon = '=',
    prefix?: string,
    type: 'plain' | 'block' | 'expr' = 'plain',
): Node<TAttrNodeCustomData> {
    const valueNode = new Node<TValueNodeCustomData>({
        name: `${icon}-value`,
        start: { token: /=(?<quote>["'`])/, omit: true },
        end: {
            token: (ctx) => {
                const q = ctx.node.data.quote
                if (!q) return ''
                return quoteEndRegex[q] || ''
            },
            omit: true,
        },
        data: { quote: '' },
    })

    const unquotedValueNode = new Node<{ content: string }>({
        name: `${icon}-unquoted-value`,
        start: { token: /=(?<content>\w+)/, omit: true },
        end: { token: /[\s/>]/, eject: true },
        data: { content: '' },
    })

    const quoteEsc = {
        '"': '&quot;',
        "'": '&apos;',
    }
    function escapeVal(value?: string, quote?: string): string {
        let v = ''
        if (value) {
            v += '='
            v += quote
                ? quote +
                  value.replace(
                      quoteReplaceRegex[quote],
                      quoteEsc[quote as '"'],
                  ) +
                  quote
                : value
        }
        return v
    }
    const codeFuncs: Record<
        'plain' | 'block' | 'expr',
        TRewriteCodeFactory<TAttrNodeCustomData>
    > = {
        plain: (node, level = 0) => {
            const { key, value, quote } = node.data
            return (
                ' '.repeat(level * 2) +
                pushString(key + escapeVal(value, quote))
            )
        },
        block: () => '',
        expr: (node, level = 0) => {
            const { key, value, quote } = node.data
            const q = (quote || '') as '"'
            const indent = ' '.repeat(level * 2)
            let s = indent + '__v = ' + ((value as string) || "''") + '\n'
            s += indent + "if (typeof __v === 'boolean') {\n"
            s += indent + `  if (__v) __ += \`${key}\`\n`
            s += indent + '} else {\n'
            s +=
                indent +
                `  __ += \`${key}=${q}` +
                '${' +
                ` (__v || '').replace(/${q}/g, '${quoteEsc[q]}') }${q}\`\n`
            s += indent + '}\n'
            return s
        },
    }
    const attrNode = new Node<TAttrNodeCustomData>({
        name: `attr-${type}`,
        start: {
            token: prefix
                ? new RegExp(`${escapeRegex(prefix)}(?<key>[\\w:\\-\\.]+)`)
                : /(?<key>[\w:\-.]+)/,
            omit: true,
        },
        end: { token: /[\s\n/>]/, eject: true },
        recognizes: [unquotedValueNode, valueNode],
        data: {
            key: '',
            code: codeFuncs[type],
        },
    })
        .onChild((child, parent) => {
            if (child.node === valueNode) {
                parent.data.quote = child.data.quote
                parent.data.value = textContent(child)
            } else if (child.node === unquotedValueNode) {
                parent.data.value = child.data.content
            }
            // Remove child from content (absorbed into data)
            const idx = parent.content.indexOf(child)
            if (idx >= 0) parent.content.splice(idx, 1)
        })
        .onClose((node) => {
            // Clear remaining content so renderCode doesn't double-process
            node.content.length = 0

            if (type === 'expr' && node.data.value) {
                try {
                    new Function(node.data.value)
                } catch (e) {
                    throw new Error(
                        'Invalid expression: ' + (e as Error).message,
                    )
                }
            }
            if (type === 'expr' && !node.data.quote) {
                throw new Error('Expression must be quoted.')
            }
        })
    return attrNode
}
