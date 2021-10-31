import { ProstoParseNode } from '@prostojs/parser'

interface TExpressionCustomData {
    expression: string
}

export class PExpression extends ProstoParseNode<TExpressionCustomData> {
    constructor(delimiters = ['{{', '}}'], stringNode?: ProstoParseNode) {
        super({
            label: 'string',
            icon: '≈',
            startsWith: {
                token: delimiters[0],
                omit: true,
            },
            endsWith: {
                token: delimiters[1],
                omit: true,
            },
            onPop({ context, customData }) {
                customData.expression = context.content.join('')
                context.content = []
            },            
            recognizes: stringNode ? [stringNode] : [],
        })
        stringNode?.addMergeWith({
            parent: this,
            join: true,
        })
    }
}
