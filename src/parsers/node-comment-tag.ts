import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const commentTagNode: TProstoParseNode<ENode> = {
    id: ENode.COMMENT,
    label: __DYE_WHITE__ + __DYE_DIM__ + 'comment',
    icon: __DYE_WHITE__ + __DYE_DIM__ + '“',
    startsWith: {
        token: '<!--',
        omit: true,
    },
    endsWith: {
        token: '-->',
        omit: true,
    },
    recognizes: [
        // ENode.EXPRESSION,
    ],
}
