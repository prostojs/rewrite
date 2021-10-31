import { ProstoParseNode } from '@prostojs/parser'
import { negativeLookBehindEscapingSlash } from '../constants'

interface TStringCustomData {
    quote: string
}

export class PString extends ProstoParseNode<TStringCustomData> {
    constructor(token = ['"', '\'', '`']) {
        super({
            label: '',
            icon: '"',
            startsWith: {
                token,
            },
            onMatch: ({ matched, customData }) => customData.quote = matched[0],
            endsWith: {
                token,
                negativeLookBehind: negativeLookBehindEscapingSlash,
                onMatchToken: ({ matched, customData }) => matched[0] === customData.quote,
            },
        })
    }
}
