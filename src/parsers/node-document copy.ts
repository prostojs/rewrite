import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const documentNode: TProstoParseNode<ENode> = {
    id: ENode.DOCUMENT,
    icon: 'HTML',
    label: 'Document',
    skipToken: /^\s+/,
    recognizes: [ENode.DOCTYPE, ENode.COMMENT, ENode.VOID_TAG, ENode.TAG, ENode.EXPRESSION],
}
