import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const noInterpolateNode: (commentPrefix: string, instructionSign: string) => TProstoParseNode<ENode> = (commentPrefix, instructionSign) => ({
    id: ENode.NO_INTERPOLATE,
    icon: 'I',
    label: 'no-interpolate-next-line',
    startsWith: {
        token: new RegExp(`^${commentPrefix}\\s*${instructionSign}no-interpolate-next-line\\s*.*\n`),
        omit: true,
    },
    popsAfterNode: ENode.IGNORED_LINE,
    popsAtEOFSource: true,
    mapContent: {
        line: (content) => content.shift(),
    },
    recognizes: [ENode.IGNORED_LINE],
})
