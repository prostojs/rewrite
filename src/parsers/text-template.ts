import { ProstoParser } from '@prostojs/parser'
import { ENode } from '../types'
import { stringNode } from './node-string'
import { stringExpressionNode } from './node-string-expression'
import { textlineNode } from './node-textline'

export const getTextParser = (interpolationDelimiters: [string, string]) => {
    const parser = new ProstoParser<ENode>({
        rootNode: ENode.TEXTLINE,
        nodes: [
            textlineNode,
            stringNode(),
            stringExpressionNode(interpolationDelimiters),
        ],
    })
    return function generate(line: string): string {
        const result = parser.parse(line)
        let code = ''
        result._content.forEach(item => {
            if (typeof item === 'string' || typeof item === 'number') {
                code += (item as string).replace(/`/g, '\\`')
            } else if (item.expression) {
                code += '${' + (item.expression as string) + '}'
            }
        })
        return code
    }
    // function generate(line: string): TRenderedFunction {
    //     const result = parser.parse(line)
    //     let code = 'with (__scope__) {\n'
    //     code += '  return `'
    //     result._content.forEach(item => {
    //         if (typeof item === 'string' || typeof item === 'number') {
    //             code += (item as string).replace(/`/g, '\\`')
    //         } else if (item.expression) {
    //             code += '${' + (item.expression as string) + '}'
    //         }
    //     })
    //     code += '`\n}\n'
    //     console.log(result.toTree())
    //     console.log(code)
    //     return {
    //         code,
    //         render: new Function('__scope__', code) as (scope?: TScope) => string,
    //     }
    // }
}
