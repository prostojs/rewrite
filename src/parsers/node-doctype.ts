import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const doctypeNode: TProstoParseNode<ENode> = {
    id: ENode.DOCTYPE,
    label: 'Document Type',
    startsWith: {
        token: '<!DOCTYPE ',
        omit: true,
    },
    endsWith: {
        token: '>',
        omit: true,
    },
    recognizes: [],
}
