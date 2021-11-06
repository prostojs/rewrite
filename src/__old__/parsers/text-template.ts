import { BasicNode, ProstoParserNodeContext } from '@prostojs/parser'
import { getExprNode, getStringNode } from './basic-html-nodes'

export const getTextParser = (interpolationDelimiters: [string, string]) => {
    interface Expression {
        expression?: string
        genCode: (item: ProstoParserNodeContext<Expression>) => string
    }
    const stringNode = getStringNode()
    const stringExprNode = getExprNode<Expression>(stringNode, interpolationDelimiters)
        .initCustomData(() => ({
            genCode: (item: ProstoParserNodeContext<Expression>) => '${' + (item.getCustomData().expression || '') + '}',
        }))
    const parser = new BasicNode<Expression>({
        icon: 'L',
        label: 'text',
    }).addRecognizes(stringExprNode)
        .initCustomData(() => ({
            genCode: (item: ProstoParserNodeContext<Expression>) => {
                let code = ''
                item.content.forEach(child => {
                    code += typeof child === 'string' ? child.replace(/`/g, '\\`') : child.getCustomData<Expression>().genCode(child)
                })
                console.log(code)
                return code
            },
        }))
    return function generate(line: string): string {
        const result = parser.parse(line)
        console.log(result.toTree())
        return result.getCustomData<Expression>().genCode(result)
    }
}

interface BlockDescr {
    key: Instructions
    exprRequired?: boolean
    opening?: boolean
    overtakes?: string[]
    closingKey?: string
    code: (d: InstructionBlockCustomData) => string
}

type Instructions = 'IF' | 'FOR' | 'ELSE' | 'ELSEIF'

const blockTypes: BlockDescr[] = [
    {
        key: 'FOR',
        exprRequired: true,
        opening: true,
        code: ({ expression }) => `for ${ expression } {\n`,
    },
    {
        key: 'IF',
        exprRequired: true,
        opening: true,
        code: ({ expression }) => `if ${ expression } {\n`,
    },
    {
        key: 'ELSEIF',
        closingKey: 'IF',
        exprRequired: false,
        opening: false,
        overtakes: ['IF', 'ELSEIF'],
        code: ({ expression }) => `} else if ${ expression } {\n`,
    },
    {
        key: 'ELSE',
        closingKey: 'IF',
        exprRequired: false,
        opening: false,
        overtakes: ['IF', 'ELSEIF'],
        code: () => '} else {\n',
    },
]

interface StringExpression {
    key: 'String'
    code: (s: string[]) => string
}

const blockTypesObj: Record<Instructions, BlockDescr> = {} as Record<Instructions, BlockDescr>
blockTypes.forEach(b => blockTypesObj[b.key] = b)

interface InstructionBlockCustomData {
    block: string
    expression: string
    rest: string
    descr: BlockDescr
    endBlock: string
    endExpression: string
    endRest: string
}

export const getTextParser2 = () => {
    const root = new BasicNode({})
    const stringNode = getStringNode()
    const stringExprNode = getExprNode<StringExpression>(stringNode, ['{{', '}}'])
    stringExprNode.initCustomData(() => {
        return {
            key: 'String',
            code: (content) => {
                return `__.push(${ content.join('') })\n`
            },
        }
    })

    const instructionNode = new BasicNode<InstructionBlockCustomData>({
        label: '',
        icon: '↳',
        tokens: [
            /^\s*(?:\/\/|#)=\s*(?<block>\w+[^\S\r\n]*\w*)[^\S\r\n]*(?<expression>\(.*\))?(?<rest>[^\n]*)?$/m,
            /^\s*(?:\/\/|#)=\s*(?<endBlock>END[^\S\r\n]*\w*)[^\S\r\n]*(?<endExpression>\(.*\))?(?<endRest>[^\n]*)?$/m,
        ],
        tokenOE: 'omit-omit',
    })
        .onMatchStartToken(({ customData, parserContext, matched }) => {
            const { block, expression, rest } = (matched as RegExpExecArray).groups as unknown as InstructionBlockCustomData
            const descr = blockTypesObj[block.replace(/[\s\n]/g, '') as Instructions]
            if (!descr) {
                parserContext.panic('Wrong instruction ' + block)
            }
            if (descr.exprRequired && !expression) {
                parserContext.panic('Expression required')
            }
            if (descr.opening) {
                return true
            }
            if (descr.overtakes && descr.overtakes.includes(customData.block)) {
                parserContext.pop()
                return true
            }
            if (customData.block) {
                parserContext.panic('Unexpected instruction ' + block + ' after ' + customData.block)
            } else {
                parserContext.panic('Unexpected instruction ' + block)
            }
        })
        .onMatch(({ customData }) => {
            customData.block = customData.block.replace(/[\s\n]/g, '')
            customData.descr = blockTypesObj[customData.block as Instructions]
        })
        .onMatchEndToken(({ customData, matched, parserContext }) => {
            const { endBlock, endExpression, endRest } = (matched as RegExpExecArray).groups as unknown as InstructionBlockCustomData
            const endKey = 'END' + (customData.descr.closingKey || customData.descr.key)
            if (endKey !== endBlock.replace(/[\s\n]/g, '')) {
                parserContext.panic('Wrong closing block instruction ' + endBlock, matched[0].length)
            }
            return true
        })
    instructionNode.addRecognizes(instructionNode, stringExprNode)
    root.addRecognizes(stringExprNode, instructionNode)

    return (source: string) => {
        const result = root.parse(source)
        const code = 
            'const __ = []\n' + 
            'with (__ctx__) {\n' +
            renderCode(result) +
            '}\n' +
            'return __.join(\'\')'
        return new Function('__ctx__', code)    
    }
}

function renderCode(context: ProstoParserNodeContext): string {
    let s = ''
    const indent = ' '.repeat(context.level*2 + 2)
    const data = context.getCustomData<InstructionBlockCustomData>()
    if (data.descr) {
        s += indent + data.descr.code(data)
    } else if ((data as unknown as StringExpression).key === 'String') {
        s += indent + (data as unknown as StringExpression).code(context.content as string[])
    }
    context.content.forEach(c => {
        if (typeof c === 'string') {
            c.split('\n').forEach(c => s += indent + `__.push(\`${ c.replace(/`/g,'\\`') }\`)\n`)
        } else {
            s += renderCode(c)
        }
    })
    return s
}
