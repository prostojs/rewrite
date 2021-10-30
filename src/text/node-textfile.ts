import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const textfileNode: TProstoParseNode<ENode> = {
    id: ENode.TEXTFILE,
    icon: 'FILE',
    label: 'text',
    recognizes: [
        ENode.NO_INTERPOLATE,
        ENode.INSTRUCTION,
        ENode.REVEAL,
        ENode.BLOCK_IF,
        ENode.BLOCK_ELSEIF,
        ENode.BLOCK_ELSE,
        // ENode.BLOCK,
        ENode.EXPRESSION,
    ],
}
