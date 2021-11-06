import { BasicNode, TBasicNodeOptions } from '@prostojs/parser'
import { TStringExpressionData, TStringNodeData } from './types'

const stringNodeOptions: TBasicNodeOptions<TStringNodeData> = {
    label: '',
    icon: '"',
    tokens: [/(?<quote>["'`])/, ({ customData }) => customData.quote || '' ],
    backSlash: '-ignore',
}
const stringNode = new BasicNode<TStringNodeData>(stringNodeOptions)

export function stringExpressionNodeFactory(interpolationDelimiters: [string, string]) {
    return new BasicNode<TStringExpressionData>({
        label: 'string',
        icon: '≈',
        tokens: [interpolationDelimiters[0], interpolationDelimiters[1] ],
        tokenOE: 'omit-omit',
    })
        .addAbsorbs(stringNode, 'join')
        .mapContent('expression', 'join-clear')
        .onPop(({ parserContext, customData: { expression } }) => {
            try {
                new Function(expression)
            } catch (e) {
                parserContext.panic('Invalid expression: ' + (e as Error).message, expression.length + interpolationDelimiters[0].length + interpolationDelimiters[1].length)
            }
        })
        .initCustomData(() => ({
            type: 'StringExpression',
            expression: '',
            code: ({ customData }, level = 0) => ' '.repeat(level * 2) + `__.push(${ customData.expression })\n`,
        }))
}
