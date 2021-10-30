import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const ignoredLineNode: () => TProstoParseNode<ENode> = () => ({
    id: ENode.IGNORED_LINE,
    icon: '-',
    label: '',
    startsWith: {
        token: '',
    },
    endsWith: {
        token: '\n',
        eject: true,
    },
    onMatch({ context, matched }) {
        context.line = (matched || [])[1]
    },
    mergeWith: [{
        parent: ENode.NO_INTERPOLATE,
    }],
    popsAtEOFSource: true,
    recognizes: [],
})
