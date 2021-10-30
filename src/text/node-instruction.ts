import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const instructionNode: (commentPrefix: string, instructionSign: string) => TProstoParseNode<ENode> = (commentPrefix, instructionSign) => ({
    id: ENode.INSTRUCTION,
    icon: 'I',
    label: '',
    startsWith: {
        token: new RegExp(`^${commentPrefix}\\s*${instructionSign}(.+)`),
        omit: true,
    },
    endsWith: {
        token: '\n',
        eject: true,
    },
    onMatch({ context, matched }) {
        context.instruction = (matched || [])[1].trim()
    },
    popsAtEOFSource: true,
    recognizes: [],
})
