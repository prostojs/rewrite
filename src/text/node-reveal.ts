import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const revealNode: (commentPrefix: string, revealSign: string) => TProstoParseNode<ENode> = (commentPrefix, revealSign) => ({
    id: ENode.REVEAL,
    icon: 'R',
    label: '',
    startsWith: {
        token: new RegExp(`${commentPrefix}${revealSign}(.+)`),
        omit: true,
    },
    endsWith: {
        token: '\n',
        eject: true,
    },
    onMatch({ context, matched }) {
        context.line = (matched || [])[1]
    },
    popsAtEOFSource: true,
    recognizes: [],
})
