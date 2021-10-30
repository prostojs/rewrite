import { TProstoParseNode } from '@prostojs/parser'
import { negativeLookBehindEscapingSlash } from './constants'
import { ENode } from '../types'

export const valueNode: TProstoParseNode<ENode> = {
    id: ENode.VALUE,
    label: 'value',
    startsWith: {
        token: ['="', '=\''],
        omit: true,
    },
    onMatch({ matched, context }) {
        context.quote = (matched && matched[0] || '')[1]
    },
    endsWith: {
        token: ['"', '\''],
        omit: true,
        negativeLookBehind: negativeLookBehindEscapingSlash,
        onMatchToken({ matched, context }) {
            const quote = matched && matched[0] || ''
            return quote === context.quote
        },
    },
    recognizes: [],
}
