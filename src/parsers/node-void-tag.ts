import { TProstoParseNode } from '@prostojs/parser'
import { htmlVoidTags } from './constants'
import { ENode } from '../types'

const token = new RegExp('^<(' + htmlVoidTags.join('|') + ')[\\s\\>]')
console.log(token)
export const voidTagNode: TProstoParseNode<ENode> = {
    id: ENode.VOID_TAG,
    label: '',
    startsWith: {
        token,
        omit: true,
        // onMatchToken(data) {
        //     return true
        // },
    },
    onMatch(data) {
        data.context.tagName = (data.matched || [])[1]
    },
    endsWith: {
        token: /^\/?\>/,
        omit: true,
    },
    onPop({ context }) {
        context._icon = '<' + (context.tagName as string) + '>'
    },
    skipToken: /^\s+/,
    mapContent: {},
    recognizes: [ENode.INSTRUCTION_ATTRIBUTE, ENode.INTERPOLATION_ATTRIBUTE, ENode.ATTRIBUTE],
}
