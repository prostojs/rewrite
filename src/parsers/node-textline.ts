import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const textlineNode: TProstoParseNode<ENode> = {
    id: ENode.TEXTLINE,
    icon: 'L',
    label: 'text',
    recognizes: [
        ENode.EXPRESSION,
    ],
}
