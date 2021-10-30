import { TProstoParseNode } from '@prostojs/parser'
import { ENode } from '../types'

export const blockNode: (commentPrefix: string, blockSign: string) => TProstoParseNode<ENode> = (commentPrefix, blockSign) => ({
    id: ENode.BLOCK,
    icon: 'B',
    label: '',
    startsWith: {
        token: new RegExp(`${ commentPrefix }${blockSign}(.+)`),
        omit: true,
    },
    endsWith: {
        token: '\n',
        eject: true,
    },
    onMatch({ context, matched }) {
        const s = (matched || ['', ''])[1]
        const [m, k, e] = /^([^\(]+)(.*\)?)\s*$/.exec(s) || []
        context._label = (k || '').replace(/\s/g, '')
        context.expression = (e || '')
    },
    popsAtEOFSource: true,
    recognizes: [],
})
