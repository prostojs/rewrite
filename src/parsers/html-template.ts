import { ProstoParser } from '@prostojs/parser'
import { TProstoRewriteOptions } from '../types'
import { attributeNode } from './node-attribute'
import { commentTagNode } from './node-comment-tag'
import { doctypeNode } from './node-doctype'
import { documentNode } from './node-document'
import { innerNode } from './node-inner'
import { instructionAttributeNode } from './node-instruction-attribute'
import { interpolationAttributeNode } from './node-interpolation-attribute'
import { stringExpressionNode } from './node-string-expression'
import { tagNode } from './node-tag'
import { valueNode } from './node-value'
import { voidTagNode } from './node-void-tag'
import { ENode } from '../types'
import { stringNode } from './node-string'

export const getHtmlParser = (opts: TProstoRewriteOptions) => {
    return new ProstoParser<ENode>({
        rootNode: ENode.DOCUMENT,
        nodes: [ 
            documentNode, 
            doctypeNode, 
            commentTagNode, 
            voidTagNode, 
            tagNode, 
            attributeNode, 
            valueNode, 
            innerNode,
            stringNode(),
            stringExpressionNode(opts.interpolationDelimiters),
            instructionAttributeNode(opts.htmlInstructionSign),
            interpolationAttributeNode(opts.htmlAttributeSign),
        ],
    })
} 
