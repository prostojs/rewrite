import { ProstoParseNode } from '@prostojs/parser'

interface TDoctypeData {
}

export class PDoctype extends ProstoParseNode<TDoctypeData> {
    constructor() {
        super({
            label: 'Document Type',
            startsWith: {
                token: '<!DOCTYPE ',
                omit: true,
            },
            endsWith: {
                token: '>',
                omit: true,
            },
            recognizes: [],
        })
    }
}
