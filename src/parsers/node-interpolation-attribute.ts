import { TProstoParseNode } from '@prostojs/parser'
import { escapeRegex } from '../utils'
import { ENode } from '../types'

export const interpolationAttributeNode: (htmlAttributeSign: string) => TProstoParseNode<ENode> = (htmlAttributeSign) => ({
    id: ENode.INTERPOLATION_ATTRIBUTE,
    label: __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + 'interpolation attribute',
    icon: __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + '≈',
    startsWith: {
        token: new RegExp('^' + escapeRegex(htmlAttributeSign) + '([^=\\s"\'`\\>]+)'),
    },
    endsWith: {
        token: /^[\s\n\/>]/,
        eject: true,
    },
    hoistChildren: [
        {
            id: ENode.VALUE,
            as: 'expression',
            removeFromContent: true,
            deep: 1,
            map: ({ _content }) => _content.join(''),
        },
    ],
    onMatch(data) {
        data.context.key = (data.matched || [])[1]
    },
    onPop({ context, error }) {
        if (typeof context.expression === 'undefined') {
            error(`Interpolation attribute "${ context.key as string }" must have value.`)
        }
        context._label = __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + __DYE_UNDERSCORE__ + (context.key as string) + __DYE_UNDERSCORE_OFF__
        context._content = []
    },
    popsAfterNode: [ENode.VALUE],
    recognizes: [ENode.VALUE],
})
