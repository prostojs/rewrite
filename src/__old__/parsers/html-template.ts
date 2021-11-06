import { BasicNode } from '@prostojs/parser'
import { TProstoRewriteOptions } from '../types'
import { escapeRegex } from '../utils'
import { htmlTextTags, htmlVoidTags } from './constants'
import { getBasicNodes, getExprNode } from './basic-html-nodes'
import { getAttrNodes } from './attr-html-nodes'

const nullableInstructions = [
    'else',
]

interface NodeData {
    key: string
    static?: string
    instructions?: { key: string, value: string}[]
    expressions?: { key: string, value: string}[]
    attributes?: { key: string, value: string}[]
    value?: string
}

export const getHtmlParser = (opts: TProstoRewriteOptions) => {
    const rootNode = new BasicNode({ icon: 'ROOT' })
        .onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))

    const { docTypeNode, cDataNode, commentNode, stringNode } = getBasicNodes()

    const { attrNode } = getAttrNodes()

    const stringExprNode = getExprNode(stringNode, opts.interpolationDelimiters)

    const innerNode = new BasicNode({
        label: 'inner',
        tokens: ['>', '</'],
        tokenOE: 'omit-eject',
    }).onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))

    const tagNode = new BasicNode<{ isText: boolean, isVoid: boolean, tag: string, endTag?: string }>({
        tokens: [
            /<(?<tag>[\w:\-\.]+)/,
            ({ customData }) => {
                if (customData.isVoid) return /\/?>/
                if (customData.isText) return new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`)
                return /(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/
            },
        ],
        tokenOE: 'omit-omit',
        skipToken: /\s/,
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
        .onBeforeChildParse((child, { context, customData }) => {
            if (customData.isText && child.node === innerNode) {
                child.clearRecognizes()
                child.removeOnAppendContent()
                context.clearSkipToken()
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
        .onPop(({ customData: { isVoid, tag, endTag }, parserContext }) => {
            if (!isVoid && typeof endTag === 'string' && tag !== endTag) {
                parserContext.panicBlock(
                    `Open tag <${ tag }> and closing tag </${ endTag }> must be equal.`,
                    tag.length || 0,
                    endTag.length + 1,
                )
            }
        })
        .addRecognizes(innerNode, attrNode)

    rootNode.addRecognizes(docTypeNode, commentNode, tagNode, stringExprNode)
    innerNode.addRecognizes(commentNode, cDataNode, tagNode, stringExprNode)
    commentNode.addRecognizes(stringExprNode)
    cDataNode.addRecognizes(stringExprNode)

    return rootNode

    // const rootNode = new GenericXmlInnerNode({ trim: false, label: '', icon: 'ROOT' })
    // const docTypeNode = new GenericNode<NodeData>({
    //     label: 'Document Type',
    //     tokens: ['<!DOCTYPE ', '>'],
    // }).mapContent('static', content => content.splice(0).join(''))
    // const cDataNode = new GenericNode<NodeData>({
    //     tokens: ['<![CDATA[', ']]>'],
    //     label: '',
    //     icon: '<![CDATA[',
    // }).mapContent('static', content => content.splice(0).join(''))
    // const commentNode = new GenericCommentNode<NodeData>({
    //     block: true,
    //     delimiters: ['<!--', '-->'],
    //     // tokenOptions: '',
    // }).mapContent('static', content => content.splice(0).join(''))
    // const innerNode = new GenericXmlInnerNode<NodeData>({ trim: false, label: 'inner' })
    // const tagNode = new GenericXmlTagNode<NodeData>({ innerNode }).clearSkipToken()
    // const valueNode = new GenericXmlAttributeValue<NodeData>(true)
    // const attrNode = new GenericXmlAttributeNode<NodeData>({ valueNode })

    // const valueQuotedNode = new GenericXmlAttributeValue<NodeData>()
    // const attrExprNode = new GenericXmlAttributeNode<NodeData>({ 
    //     notNull: true,
    //     valueNode: valueQuotedNode,
    //     prefix: opts.htmlAttributeSign,
    // })
    // attrExprNode.icon = '≈'
    // attrExprNode.label = 'expr'
    // const attrInstrNode = new GenericXmlAttributeNode<NodeData>({
    //     valueNode: valueQuotedNode,
    //     prefix: opts.htmlInstructionSign,
    // })
    //     .onMatch(({ parserContext, customData: { key }}) => {
    //         if (['else', 'else-if'].includes(key)) {
    //             const parentContent = parserContext.fromStack(1).content.filter(p => typeof p !== 'string')
    //             const prevNode = parentContent[parentContent.length - 2]
    //             if (!prevNode || !(prevNode instanceof ProstoParserNodeContext)) {
    //                 parserContext.panic(`The instruction key "${ key }" must follow "if" or "else-if" node.`, key.length)
    //             } else if (prevNode instanceof ProstoParserNodeContext && prevNode.getCustomData<NodeData>().instructions?.length) {
    //                 const prevInstructions = prevNode.getCustomData<NodeData>().instructions?.map(d => d.key) || []
    //                 if (!prevInstructions.includes('if') && !prevInstructions.includes('else-if')) {
    //                     parserContext.panic(`The instruction key "${ key }" must follow "if" or "else-if" node.`, key.length)
    //                 }
    //             }
    //         }
    //     })
    //     .onPop(({ parserContext, customData: { key, value } }) => {
    //         const nullable = nullableInstructions.includes(key)
    //         if (nullable && typeof value === 'string') {
    //             parserContext.panic(`The instruction key "${ key }" mustn't have value. Received "${ value }".`, value.length)
    //         } else if (!nullable && !value) {
    //             parserContext.panic(`The instruction key "${ key }" must have value. Received no value.`, key.length || 0)
    //         }
    //     })
    // attrInstrNode.icon = '↳'
    // attrInstrNode.label = 'instr'

    // tagNode.addHoistChildren<NodeData>({
    //     node: attrInstrNode,
    //     map: context => ({ key: context.getCustomData().key, value: context.getCustomData().value }),
    //     as: 'instructions',
    //     asArray: true,
    //     removeChildFromContent: true,
    //     deep: 1,
    // })

    // const stringNode = new GenericStringNode<NodeData>()
    // const expression = new GenericStringExpressionNode<NodeData>(stringNode)
        
    // rootNode.addRecognizes(docTypeNode, commentNode, tagNode, expression)
    // innerNode.addRecognizes(commentNode, cDataNode, tagNode, expression)
    // tagNode.addRecognizes(innerNode, attrExprNode, attrInstrNode, attrNode)
    // cDataNode.addRecognizes(expression)

    // innerNode.addMergeWith({
    //     parent: tagNode,
    // })

    // return rootNode
}

