import { Node, ParsedNode, printTree } from '@prostojs/parser'
import { TStringExpressionData } from '.'
import { stringExpressionNodeFactory } from './string-expression'
import {
    TProstoRewriter,
    TProstoRewriteContext,
    TRewriteNodeType,
} from './types'
import { debug as printDebug } from './utils'

export function genFunc(
    code: string,
): (context?: TProstoRewriteContext) => string {
    try {
        return new Function(
            '__ctx__',
            'process',
            'window',
            'global',
            'require',
            code,
        ) as (context?: TProstoRewriteContext) => string
    } catch (e) {
        console.error((e as Error).message)
        console.error((e as Error).stack)
        throw e
    }
}

/** @deprecated Use genFunc instead */
export const genSafeFunc = genFunc

function escapeString(s: string): string {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n')
        .replace(/\$/g, '\\$')
}

export function pushString(s: string): string {
    return `__ += \`${escapeString(s)}\`\n`
}

export function renderCode(parsed: ParsedNode, level = 1) {
    let s = ''
    let result = ''
    function renderS() {
        if (s) {
            result += indent + pushString(s)
            s = ''
        }
    }
    const indent = ' '.repeat(level * 2)
    parsed.content.forEach((c) => {
        if (typeof c === 'string') {
            s += c
        } else {
            renderS()
            const data = c.data as TRewriteNodeType
            if (data.openCode) {
                result += indent + data.openCode
            }
            if (data.code) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                result += data.code(c, level)
            }
            result += renderCode(c, level + (data.openCode ? 1 : 0))
            if (data.closeCode) {
                result += indent + data.closeCode
            }
        }
    })
    renderS()
    return result
}

function buildRewriter(
    rootNode: Node,
    codeGen: (source: string) => string,
    cacheSize = 128,
): TProstoRewriter {
    const cache = new Map<string, (context?: TProstoRewriteContext) => string>()

    function getFunc(source: string) {
        let func = cache.get(source)
        if (func) return func

        const code = codeGen(source)
        const compiled = genFunc(code)
        func = (context?: TProstoRewriteContext) => {
            try {
                return compiled(context)
            } catch (e) {
                throwErrorFromFunction(e as Error, code)
            }
        }

        // LRU eviction: remove oldest entry when cache is full
        if (cache.size >= cacheSize) {
            const firstKey = cache.keys().next().value
            if (firstKey !== undefined) cache.delete(firstKey)
        }
        cache.set(source, func)
        return func
    }

    function print(source: string) {
        return console.log(printTree(rootNode.parse(source)))
    }

    return {
        genRewriteCode: codeGen,
        genRewriteFunction: getFunc,
        printAsTree: print,
        rewrite: (source: string, context?: TProstoRewriteContext) =>
            getFunc(source)(context || {}),
    }
}

// Merge consecutive `__ += \`...\`` lines into a single statement
const coalesceRe = /__ \+= `([^`]*)`\n\s*__ \+= `/g
function coalesceStrings(code: string): string {
    let prev = ''
    while (prev !== code) {
        prev = code
        code = code.replace(coalesceRe, '__ += `$1')
    }
    return code
}

export function getRewriter(
    rootNode: Node,
    debug = false,
): TProstoRewriter {
    return buildRewriter(rootNode, (source) => {
        const result = rootNode.parse(source)
        if (debug) {
            printDebug('Parsed tree view:\n' + printTree(result))
        }
        const body = coalesceStrings(renderCode(result))
        return (
            "let __ = ''\n" +
            "let __v = ''\n" +
            'with (__ctx__) {\n' +
            body +
            '}\n' +
            'return __'
        )
    })
}

function throwErrorFromFunction(e: Error, code: string): never {
    const relevantLine = e.stack?.split('\n')[1] || ''
    const regex = /<anonymous>:(\d+):(\d+)\)/g
    const match = regex.exec(relevantLine)
    if (match) {
        const row = parseInt(match[1], 10) - 2
        const col = parseInt(match[2], 10) - 1
        const lines = code.split('\n')
        const output = renderCodeFragmentSimple(lines, row, col)
        console.error(__DYE_RED_BRIGHT__ + e.message + __DYE_COLOR_OFF__)
        console.error(output)
    }
    throw e
}

function renderCodeFragmentSimple(lines: string[], row: number, errorCol: number): string {
    const start = Math.max(0, row - 2)
    const end = Math.min(lines.length, row + 3)
    let output = ''
    for (let i = start; i < end; i++) {
        const lineNum = String(i + 1).padStart(4, ' ')
        const marker = i === row ? ' > ' : '   '
        output += `${lineNum}${marker}${lines[i]}\n`
        if (i === row && errorCol >= 0) {
            output += '    ' + '   ' + ' '.repeat(errorCol) + '^\n'
        }
    }
    return output
}

export function getStringExpressionRewriter(
    interpolationDelimiters: [string, string] = ['{{', '}}'],
) {
    const stringExpression = stringExpressionNodeFactory(
        interpolationDelimiters,
    )
    const rootNode = new Node({
        name: 'string-expr-root',
        recognizes: [stringExpression],
        eofClose: true,
    })

    return buildRewriter(rootNode, (source) => {
        const result = rootNode.parse(source)
        return (
            'let __ = []\n' +
            'with (__ctx__) {\n' +
            result.content
                .map(
                    (c) =>
                        `__.push(${
                            typeof c === 'string'
                                ? `\`${escapeString(c)}\``
                                : `${(c as ParsedNode<TStringExpressionData>).data.expression}`
                        })`,
                )
                .join('\n  ') +
            '}\n' +
            "return __.length === 1 ? __[0] : __.join('')"
        )
    })
}
