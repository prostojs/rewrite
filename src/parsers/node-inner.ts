import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const innerNode: TProstoParseNode<ENode> = {
    id: ENode.INNER,
    label: 'inner',
    startsWith: {
        token: '>',
        omit: true,
    },
    endsWith: {
        token: '</',
        eject: true,
    },
    // mergeWith: [{
    //     parent: ENode.TAG,
    // }],
    recognizes: [ENode.COMMENT, ENode.VOID_TAG, ENode.TAG, ENode.EXPRESSION],
}
