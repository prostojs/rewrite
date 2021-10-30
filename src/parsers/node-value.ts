import { TProstoParseNode } from '@prostojs/parser'
import { negativeLookBehindEscapingSlash } from './constants'
import { ENode } from '../types'

export const valueNode: TProstoParseNode<ENode> = {
    id: ENode.VALUE,
    label: 'value',
    startsWith: {
        token: '="',
        omit: true,
    },
    endsWith: {
        token: '"',
        omit: true,
        negativeLookBehind: negativeLookBehindEscapingSlash,
    },
    recognizes: [],
}
