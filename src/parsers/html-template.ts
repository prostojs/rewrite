import { ProstoParser, ProstoParseNode } from '@prostojs/parser'
import { TProstoRewriteOptions } from '../types'
import { PDoctype, PExpression } from './classes'
import { PComment } from './classes'
import { PTag } from './classes'
import { PAttribute } from './classes'
import { PValue } from './classes'
import { PString } from './classes'

export const getHtmlParser = (opts: TProstoRewriteOptions) => {
    const rootNode = new ProstoParseNode({
        icon: 'HTML',
        label: 'Document',
        // skipToken: /^\s+/,
    })
    const innerNode = new ProstoParseNode<{ test: boolean }>({
        label: 'inner',
        startsWith: { token: '>', omit: true },
        endsWith: { token: '</', eject: true },
    })
    
    const doctypeNode = new PDoctype()
    const commentNode = new PComment()
    const voidTagNode = new PTag(true)
    const tagNode = new PTag()
    const valueNode = new PValue()
    const attrNode = new PAttribute(valueNode)
    const stringNode = new PString()
    const stringExprNode = new PExpression(opts.interpolationDelimiters, stringNode)
    const instructionAttrNode = new PAttribute(valueNode, true, opts.htmlInstructionSign, __DYE_BLUE_BRIGHT__ + '↳')
    const interpolationAttrNode = new PAttribute(valueNode, false, opts.htmlAttributeSign, __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + '≈')

    innerNode.addRecognizableNode(commentNode, voidTagNode, tagNode, stringExprNode)
    rootNode.addRecognizableNode(doctypeNode, ...innerNode.recognizes)
    voidTagNode.addRecognizableNode(instructionAttrNode, interpolationAttrNode, attrNode)
    tagNode.addRecognizableNode(innerNode, ...voidTagNode.recognizes)

    return new ProstoParser({
        rootNode,
        nodes: [ 
            doctypeNode,
            commentNode,
            voidTagNode,
            tagNode,
            attrNode,
            valueNode,
            innerNode,
            stringNode,
            stringExprNode,
            instructionAttrNode,
            interpolationAttrNode,
        ],
    })
}
