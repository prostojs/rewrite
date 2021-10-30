import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'
import { negativeLookBehindEscapingSlash } from './constants'

export const stringNode: () => TProstoParseNode<ENode> = () => ({
    id: ENode.STRING,
    label: '',
    icon: '"',
    startsWith: {
        token: ['"', '\'', '`'],
    },
    onMatch({ matched, context }) {
        context.quote = matched && matched[0] || ''
        console.log('onMatch', context.quote)
    },
    endsWith: {
        token: ['"', '\'', '`'],
        negativeLookBehind: negativeLookBehindEscapingSlash,
        onMatchToken({ matched, context }) {
            const quote = matched && matched[0] || ''
            console.log('onMatchToken end', quote)
            return quote === context.quote
        },
    },
    mergeWith: [{
        parent: ENode.EXPRESSION,
        join: true,
    }],
    recognizes: [],
})
