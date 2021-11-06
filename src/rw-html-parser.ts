import { BasicNode, ProstoParserNodeContext, TBasicNodeOptions } from '@prostojs/parser'
import { htmlTextTags, htmlVoidTags } from './constants'
import { getParser, pushString } from './rw-common'
import { stringExpressionNodeFactory } from './string-expression'
import { TAttrNodeCustomData, THTMLBlockDescr, THTMLBlockOperations, TRewriteCodeFactory, TTagNodeCustomData, TValueNodeCustomData } from './types'
import { escapeRegex } from './utils'

const docTypeNodeOptions: TBasicNodeOptions = {
    label: 'Document Type',
    tokens: ['<!DOCTYPE ', '>'],
}
   
const cDataNodeOptions: TBasicNodeOptions = {
    icon: '<![CDATA[',
    tokens: ['<![CDATA[', ']]>'],
}
   
const commentNodeOptions: TBasicNodeOptions = {
    label: 'comment',
    icon: '“',
    tokens: ['<!--', '-->'],
}

const valueNodeOptions: TBasicNodeOptions<TValueNodeCustomData> = {
    label: 'value',
    icon: '=',
    tokens: [/=(?<quote>["'`])/, ({ customData }) => customData.quote || '' ],
    backSlash: '-ignore',
    tokenOE: 'omit-omit',
}

const valueNode = new BasicNode<TValueNodeCustomData>(valueNodeOptions)

const unquotedValueNodeOptions: TBasicNodeOptions = {
    label: 'value',
    icon: '=',
    tokens: [/=(?<content>\w+)/, /[\s\/\>]/ ],
    tokenOE: 'omit-eject',
}

const unquotedValueNode = new BasicNode(unquotedValueNodeOptions)

const innerNodeOptions: TBasicNodeOptions = {
    label: 'inner',
    tokens: ['>', '</'],
    tokenOE: '-eject',
}

const htmlBlockTypes: THTMLBlockDescr[] = [
    {
        key: 'for',
        exprRequired: true,
        compatible: ['if'],
        opening: true,
        renderOpen: (v?: string) => `for (${ v || '' }) {\n`,
    },
    {
        key: 'if',
        exprRequired: true,
        compatible: ['for'],
        opening: true,
        renderOpen: (v?: string) => `if (${ v || '' }) {\n`,
    },
    {
        key: 'else-if',
        closingKey: 'IF',
        exprRequired: true,
        opening: false,
        overtakes: ['if', 'else-if'],
        renderOpen: (v?: string) => `} else if (${ v || '' }) {\n`,
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

const htmlBlockTypesO: Record<THTMLBlockOperations, THTMLBlockDescr> = {} as Record<THTMLBlockOperations, THTMLBlockDescr>
htmlBlockTypes.forEach(b => htmlBlockTypesO[b.key] = b)

export const getHtmlParser = () => {
    const rootNode = new BasicNode({ icon: 'ROOT' })

    const docTypeNode = new BasicNode(docTypeNodeOptions)
    const cDataNode = new BasicNode(cDataNodeOptions)
    const commentNode = new BasicNode(commentNodeOptions)

    const innerNode = new BasicNode(innerNodeOptions)
    const stringExpressionNode = stringExpressionNodeFactory(['{{', '}}'])

    const attrNode = attributeNodeFactory()
    const attrBlockOperationNode = attributeNodeFactory('↳', 'v-', 'block')
    const attrExprNode = attributeNodeFactory('≈', ':', 'expr')
    const attrNodes = [attrBlockOperationNode, attrExprNode, attrNode]

    const tagNode = new BasicNode<TTagNodeCustomData>({
        tokens: [
            /\s*<(?<tag>[\w:\-\.]+)/,
            ({ customData }) => {
                if (customData.isVoid) return /\/?>/
                if (customData.isText) return new RegExp(`\\s*<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`)
                return /(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/
            },
        ],
    })
        .onMatch(({ context, customData }) => {
            context.icon = customData.tag,
            customData.isVoid = htmlVoidTags.includes(customData.tag)
            customData.isText = htmlTextTags.includes(customData.tag)
            if (customData.isVoid) {
                context.clearRecognizes(innerNode)
            }
            if (customData.isText) {
                context.addAbsorbs(innerNode, 'join')
            }
        })
        .onBeforeChildParse((child, { customData }) => {
            if (customData.isText && child.node === innerNode) {
                child.clearRecognizes()
                child.removeOnAppendContent()
                child.endsWith = {
                    token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`),
                    eject: true,
                }
            }
        })
        .onAfterChildParse((child, { context }) => {
            if (child.node === innerNode) {
                context.clearRecognizes()
            }
        })
        .onPop(({ customData: { isVoid, tag, endTag, operations }, parserContext, customData, context }) => {
            if (operations && operations.length) {
                operations = operations.sort((a) => a.key === 'for' ? -1 : 1)
                customData.operation = operations[0].key as THTMLBlockOperations
                for (let i = 0; i < operations.length; i++) {
                    const { key, value } = operations[i]
                    const descr = htmlBlockTypesO[key as THTMLBlockOperations]
                    if (!descr) {
                        parserContext.panicBlock(`Unknown block operation "${ key }".`, tag.length, tag.length + 1)
                    }
                    if (descr.exprRequired && !value) {
                        parserContext.panicBlock(`Expression required for "${ key }" operation.`, tag.length, tag.length + 1)
                    }
                    if (!descr.exprRequired && !!value) {
                        parserContext.panicBlock(`Unexpected expression for "${ key }" operation.`, tag.length, tag.length + 1)
                    }
                    if (descr.overtakes) {
                        const prevNode = context.getPrevNode()
                        const prevContext = context.getPrevContext() as ProstoParserNodeContext<TTagNodeCustomData>
                        if (typeof prevNode === 'string' && prevNode.replace(/[\s\n\r]/g, '')) {
                            parserContext.panicBlock(`Unexpected block operation "${ descr.key }".`, tag.length, tag.length + 1)
                        }
                        if (!prevContext ||
                            !descr.overtakes.includes(prevContext.getCustomData().operation as THTMLBlockOperations) ) {
                            parserContext.panicBlock(`Unexpected block operation "${ descr.key }".`, tag.length, tag.length + 1)
                        }
                        const prevData = prevContext.getCustomData()
                        prevData.closeCode = ''
                    }
                }
                if (operations.length === 1) {
                    const descr = htmlBlockTypesO[operations[0].key as THTMLBlockOperations]
                    customData.openCode = descr.renderOpen(operations[0].value)
                    customData.closeCode = '}\n'
                } else if (operations.length === 2) {
                    const descr1 = htmlBlockTypesO[operations[0].key as THTMLBlockOperations]
                    const descr2 = htmlBlockTypesO[operations[1].key as THTMLBlockOperations]
                    if (!descr1.compatible?.includes(descr2.key) || !descr2.compatible?.includes(descr1.key)) {
                        parserContext.panicBlock(`Block operation "${ descr1.key }" is not compatible with "${ descr2.key }".`, tag.length, tag.length + 1)
                    }
                    customData.openCode = descr1.renderOpen(operations[0].value) + descr2.renderOpen(operations[1].value)
                    customData.closeCode = '}\n}\n'
                } else {
                    parserContext.panicBlock(`Too many block operations "${ operations.map(o => o.key).join(', ') }".`, tag.length, tag.length + 1)
                }
            }
            if (!isVoid && typeof endTag === 'string' && tag !== endTag) {
                parserContext.panicBlock(
                    `Open tag <${ tag }> and closing tag </${ endTag }> must be equal.`,
                    tag.length || 0,
                    endTag.length + 1,
                )
            }
        })
        .addRecognizes(innerNode, ...attrNodes)
        .addHoistChildren({
            node: attrBlockOperationNode,
            as: 'operations',
            asArray: true,
            deep: 1,
            mapRule: 'customData',
        })

    rootNode.addRecognizes(docTypeNode, commentNode, tagNode, stringExpressionNode)
    innerNode.addRecognizes(commentNode, cDataNode, tagNode, stringExpressionNode)
    commentNode.addRecognizes(stringExpressionNode)
    cDataNode.addRecognizes(stringExpressionNode)

    return getParser(rootNode)
}

function attributeNodeFactory(icon = '=', prefix?: string, type: 'plain' | 'block' | 'expr' = 'plain'): BasicNode<TAttrNodeCustomData> {
    const attrNodeOptions: TBasicNodeOptions<TAttrNodeCustomData> = {
        label: '',
        icon,
        tokens: [
            prefix ? new RegExp(`${ escapeRegex(prefix) }(?<key>[\\w:\\-\\.]+)`) : /(?<key>[\w:\-\.]+)/,
            /[\s\n\/>]/,
        ],
        tokenOE: 'omit-eject',
    }
    const quoteEsc = {
        '"': '&quot;',
        '\'': '&apos;',
    }
    function escapeVal(value?: string, quote?: string): string {
        let v = ''
        if (value) {
            v += '='
            v += quote ? (quote + value.replace(new RegExp(quote, 'g'), quoteEsc[quote as '"']) + quote) : value
        }
        return v
    }
    const children = prefix ? [valueNode] : [unquotedValueNode, valueNode]
    const codeFuncs: Record<'plain' | 'block' | 'expr', TRewriteCodeFactory<TAttrNodeCustomData>> = {
        plain: ({ customData: { key, value, quote } }, level = 0) => {
            return ' '.repeat(level * 2) + pushString(key + escapeVal(value, quote))
        },
        block: () => '',
        expr: ({ customData: { key, value, quote } }, level = 0) => {
            const q = (quote || '') as '"'
            const indent = ' '.repeat(level * 2)
            let s = indent + '__v = ' + (value as string || '\'\'') + '\n'
            s += indent + 'if (typeof __v === \'boolean\') {\n'
            s += indent + `  if (__v) __.push(\`${ key }\`)\n`
            s += indent + '} else {\n'
            s += indent + `  __.push(\`${ key }=${ q }` + '${' +` (__v || '').replace(/${ q }/g, '${ quoteEsc[q] }') }${ q }\`)\n`
            s += indent + '}\n'
            return s
        },
    }
    const attrNode = new BasicNode<TAttrNodeCustomData>(attrNodeOptions)
        .addPopsAfterNode(...children)
        .addHoistChildren({
            node: valueNode,
            as: 'quote',
            deep: 1,
            mapRule: 'customData.quote',
        })
        .onPop(({ parserContext, customData: { value } }) => {
            if (type === 'expr' && value) {
                try {
                    new Function(value)
                } catch (e) {
                    parserContext.panic('Invalid expression: ' + (e as Error).message, value.length + 1)
                }
            }
        })
        .addAbsorbs(children, 'join->value')
        .initCustomData(() => ({
            key: '',
            code: codeFuncs[type],
        }))
    return attrNode
}
