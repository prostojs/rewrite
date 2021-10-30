import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const attributeNode: TProstoParseNode<ENode> = {
    id: ENode.ATTRIBUTE,
    label: 'attribute',
    icon: '=',
    startsWith: {
        token: /^[a-zA-Z0-9\.\-\_\@]/,
    },
    endsWith: {
        token: /^[\s\n\/>]/,
        eject: true,
    },
    hoistChildren: [
        {
            id: ENode.VALUE,
            as: 'value',
            removeFromContent: true,
            deep: 1,
            map: ({ _content }) => _content.join(''),
        },
    ],
    mapContent: {
        key: (content) => content.shift(),
    },
    onPop({ context }) {
        context._label = (context.key as string)
    },
    popsAfterNode: [ENode.VALUE],
    recognizes: [ENode.VALUE],
}
