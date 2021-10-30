import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const tagNode: TProstoParseNode<ENode> = {
    id: ENode.TAG,
    label: '',
    startsWith: {
        token: '<',
        negativeLookAhead: /^\//,
        omit: true,
    },
    icon: '<>',
    endsWith: {
        token: /^(?:\/\>|\<\/\s*(\w+)\s*\>)/,
        omit: true,
        onMatchToken: ({ context, matched }) => {
            context.endTagName = matched ? matched[1] : null
            return true
        },
    },
    skipToken: /^\s+/,
    onPop({ context, error }) {
        if (
            typeof context.endTagName === 'string' &&
            context.tagName !== context.endTagName
        ) {
            error(
                `Open tag <${context.tagName as string}> and closing tag </${context.endTagName}> must be equal`,
            )
        }
        context._icon = '<' + (context.tagName as string) + '>'
    },
    mapContent: {
        tagName: (content) =>
            (
                content.shift() as unknown as Record<
                    string,
                    string
                >
            ).key,
    },
    recognizes: [ENode.INNER, ENode.INSTRUCTION_ATTRIBUTE, ENode.INTERPOLATION_ATTRIBUTE, ENode.ATTRIBUTE],
}
