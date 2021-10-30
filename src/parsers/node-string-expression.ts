import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const stringExpressionNode: (interpolationDelimiters: [string, string]) => TProstoParseNode<ENode> = (interpolationDelimiters) => ({
    id: ENode.EXPRESSION,
    label: 'string',
    icon: '≈',
    startsWith: {
        token: interpolationDelimiters[0],
        omit: true,
    },
    endsWith: {
        token: interpolationDelimiters[1],
        omit: true,
    },
    onPop({ context }) {
        context.expression = context._content.join('')
        context._content = []
    },
    recognizes: [],
})
