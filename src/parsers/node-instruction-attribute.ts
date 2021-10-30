import { TProstoParseNode } from '@prostojs/parser'
import { escapeRegex } from '../utils'
import { ENode } from '../types'

export const instructionAttributeNode: (htmlInstructionSign: string) => TProstoParseNode<ENode> = (htmlInstructionSign) => ({
    id: ENode.INSTRUCTION_ATTRIBUTE,
    label: __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + 'instruction attribute',
    icon: __DYE_BLUE_BRIGHT__ + '↳',
    startsWith: {
        token: new RegExp('^' + escapeRegex(htmlInstructionSign) + '([^=\\s"\'`\\>]+)'),
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
    onMatch({ context, matched }) {
        context.key = (matched || [])[1]
    },
    onPop({ context, error }) {
        if (['for', 'if', 'else-if'].includes(context.key as string) && typeof context.expression === 'undefined') {
            error(`Instruction "${ context.key as string }" must have expression.`)
        }
        context._label = __DYE_RESET__ + __DYE_BLUE_BRIGHT__ + __DYE_UNDERSCORE__ + (context.key as string) + __DYE_UNDERSCORE_OFF__ + '()'
        context._content = []
    },
    popsAfterNode: [ENode.VALUE],
    recognizes: [ENode.VALUE],
})
