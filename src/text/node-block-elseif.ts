import { TProstoParseNode } from '@prostojs/parser'
import { ENode, RG2 } from '../types'

export const blockElseIfNode: (rg: RG2) => TProstoParseNode<ENode> = (rg) => ({
    id: ENode.BLOCK_ELSEIF,
    icon: 'ELSEIF',
    label: '',
    startsWith: {
        token: rg.elseif,
        omit: true,
    },
    endsWith: {
        token: rg.endif1,
        eject: true,
    },
    onMatch({ context, matched }) {
        const s = (matched || ['', ''])[1]
        context.expression = s
    },
    recognizes: [
        ENode.NO_INTERPOLATE,
        ENode.INSTRUCTION,
        ENode.REVEAL,
        ENode.BLOCK_IF,
        ENode.BLOCK_ELSEIF,
        // ENode.BLOCK,
        ENode.EXPRESSION,
    ],
})
