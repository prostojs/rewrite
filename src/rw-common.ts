import { ProstoParserNode, ProstoParserNodeContext, renderCodeFragment } from '@prostojs/parser'
import { TProstoRewriter, TProstoRewriteContext, TRewriteNodeType } from './types'
import { debug as printDebug } from './utils'

export function genSafeFunc(code: string): (context?: TProstoRewriteContext) => string {
    try {
        return new Function('__ctx__', 'process', 'window', 'global', 'require', code) as (context?: TProstoRewriteContext) => string
    } catch(e) {
        console.error((e as Error).message)
        console.error((e as Error).stack)
        throw e
    }
}

export function pushString(s: string): string {
    return `__ += \`${ s.replace(/`/g,'\\`').replace(/\n/g, '\\n') }\`\n`
}

export function renderCode(context: ProstoParserNodeContext, level = 1) {
    let s = ''
    let result = ''
    function renderS() {
        if (s) {
            result += indent + pushString(s)
            s = ''
        }
    }
    const indent = ' '.repeat(level * 2)
    context.content.forEach(c => {
        if (typeof c === 'string') {
            s += c
        } else {
            renderS()
            const data = c.getCustomData<TRewriteNodeType>()
            if (data.openCode) {
                result += indent + data.openCode
            }
            if (data.code) {
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

export function getRewriter(rootNode: ProstoParserNode, debug = false): TProstoRewriter {
    function getCode(source: string): string {
        const result = rootNode.parse(source)
        if (debug) {
            printDebug('Parsed tree view:\n' + result.toTree())
        }
        return 'let __ = \'\'\n' + 
            'let __v = \'\'\n' +
            'with (__ctx__) {\n' +
            renderCode(result) +
            '}\n' +
            'return __'
    }
    function getFunc(source: string) {
        const code = getCode(source)
        const func = genSafeFunc(code)
        return (context?: TProstoRewriteContext) => {
            try {
                return func(context)
            } catch (e) {
                throwErrorFromFunction(e as Error, code)
            }
        }
    }
    function print(source: string) {
        return console.log(rootNode.parse(source).toTree())
    }

    return {
        genRewriteCode: getCode,
        genRewriteFunction: getFunc,
        printAsTree: print,
        rewrite: (source: string, context?: TProstoRewriteContext) => getFunc(source)(context || {}),
    }
}

function throwErrorFromFunction(e: Error, code: string): never {
    const relevantLine = e.stack?.split('\n')[1] || ''
    const regex = /<anonymous>:(\d+):(\d+)\)/g
    const match = regex.exec(relevantLine)
    if (match) {
        const row = parseInt(match[1], 10) - 2
        const col = parseInt(match[2], 10) - 1
        const output = renderCodeFragment(code.split('\n'), {
            row,
            error: col,
        })
        console.error(__DYE_RED_BRIGHT__ + e.message + __DYE_COLOR_OFF__)
        console.error(output)
    }
    throw e
}
