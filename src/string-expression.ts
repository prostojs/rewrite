import { Node, textContent } from '@prostojs/parser'
import { TStringExpressionData, TStringNodeData } from './types'

const quoteEndRegex: Record<string, RegExp> = {
    '"': /(?<=(?<!\\)(?:\\\\)*)"/ ,
    "'": /(?<=(?<!\\)(?:\\\\)*)'/,
    '`': /(?<=(?<!\\)(?:\\\\)*)`/,
}

const stringNode = new Node<TStringNodeData>({
    name: 'string',
    start: { token: /(?<quote>["'`])/ },
    end: {
        token: (ctx) => {
            const q = ctx.node.data.quote
            if (!q) return ''
            return quoteEndRegex[q] || ''
        },
    },
    data: { quote: '' },
})

export function stringExpressionNodeFactory(
    interpolationDelimiters: [string, string],
) {
    return new Node<TStringExpressionData>({
        name: 'string-expression',
        start: { token: interpolationDelimiters[0], omit: true },
        end: { token: interpolationDelimiters[1], omit: true },
        recognizes: [stringNode],
        data: {
            expression: '',
            code: (node, level = 0) =>
                ' '.repeat(level * 2) +
                `__ += ${node.data.expression.trim()}\n`,
        },
    })
        .onClose((node) => {
            // Build expression from content: strings joined + string node children
            // converted to their text representation (with quotes)
            node.data.expression = node.content
                .map((c) => {
                    if (typeof c === 'string') return c
                    // String node child - include its full text content (with quotes)
                    return textContent(c)
                })
                .join('')
            // Clear content so renderCode doesn't double-process
            node.content.length = 0

            try {
                new Function(node.data.expression)
            } catch (e) {
                throw new Error(
                    'Invalid expression: ' + (e as Error).message,
                )
            }
        })
}
