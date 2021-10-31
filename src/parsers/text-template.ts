import { ProstoParseNode, ProstoParser } from '@prostojs/parser'
import { PExpression, PString } from './classes'

export const getTextParser = (interpolationDelimiters: [string, string]) => {
    const stringNode = new PString()

    const stringExprNode = new PExpression(interpolationDelimiters, stringNode)

    const rootNode = new ProstoParseNode({
        icon: 'L',
        label: 'text',
        recognizes: [stringExprNode.id],
    })

    const parser = new ProstoParser({
        rootNode,
        nodes: [
            stringNode,
            stringExprNode,
        ],
    })

    return function generate(line: string): string {
        const result = parser.parse(line)
        let code = ''
        console.log(result.toTree())
        result.content.forEach(item => {
            if (typeof item === 'string' || typeof item === 'number') {
                code += (item as string).replace(/`/g, '\\`')
            } else if (item.getCustomData().expression) {
                code += '${' + (item.getCustomData().expression as string) + '}'
            }
        })
        return code
    }
}
