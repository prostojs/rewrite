import { TProstoParseNode } from '@prostojs/parser'
import { ENode, RG2 } from '../types'

export const blockIfNode: (rg: RG2) => TProstoParseNode<ENode> = (rg) => ({
    id: ENode.BLOCK_IF,
    icon: 'IF',
    label: '',
    startsWith: {
        token: rg.if,
        omit: true,
    },
    endsWith: {
        token: rg.endif1,
        omit({ matched }) {
            const s = (matched as RegExpMatchArray)[0]
            return rg.endif2.test(s)
        },
        eject({ matched }) {
            const s = (matched as RegExpMatchArray)[0]
            return !rg.endif2.test(s)
        },
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
