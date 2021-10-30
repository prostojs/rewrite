import { ProstoParser } from '@prostojs/parser'
import { ENode, TRenderedFunction, TScope } from '../types'
import { stringExpressionNode } from './node-string-expression'
import { textlineNode } from './node-textline'

export const getTextParser = (interpolationDelimiters: [string, string]) => {
    const parser = new ProstoParser<ENode>({
        rootNode: ENode.TEXTLINE,
        nodes: [
            textlineNode,
            stringExpressionNode(interpolationDelimiters),
        ],
    })
    return function generate(line: string): TRenderedFunction {
        const result = parser.parse(line)
        let code = 'with (__scope__) {\n'
        code += '  return `'
        result._content.forEach(item => {
            if (typeof item === 'string' || typeof item === 'number') {
                code += (item as string).replace(/`/g, '\\`')
            } else if (item.expression) {
                code += '${' + (item.expression as string) + '}'
            }
        })
        code += '`\n}\n'
        console.log(code)
        return {
            code,
            render: new Function('__scope__', code) as (scope?: TScope) => string,
        }
    }
}
