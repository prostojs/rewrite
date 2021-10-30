import { TProstoParseNode } from '@prostojs/parser'
import { ENode, RG2 } from '../types'

export const blockElseNode: (rg: RG2) => TProstoParseNode<ENode> = (rg) => ({
    id: ENode.BLOCK_ELSE,
    icon: 'ELSE',
    label: '',
    startsWith: {
        token: rg.else,
        omit: true,
    },
    endsWith: {
        token: rg.endif2,
        omit: true,
    },
    recognizes: [
        ENode.NO_INTERPOLATE,
        ENode.INSTRUCTION,
        ENode.REVEAL,
        ENode.BLOCK_IF,
        // ENode.BLOCK_ELSEIF,
        // ENode.BLOCK_ELSE,
        // ENode.BLOCK,
        ENode.EXPRESSION,
    ],
})
