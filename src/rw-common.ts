import { ProstoParserNode, ProstoParserNodeContext } from '@prostojs/parser'
import { TRewriteNodeType } from './types'

export function genSafeFunc(code: string): (scope?: Record<string, unknown>) => string {
    try {
        console.log(code)
        return new Function('__ctx__', 'process', 'window', 'global', 'require', code) as (scope?: Record<string, unknown>) => string
    } catch(e) {
        console.error((e as Error).message)
        console.error((e as Error).stack)
        throw e
    }
}

export function pushString(s: string): string {
    return `__.push(\`${ s.replace(/`/g,'\\`').replace(/\n/g, '\\n') }\`)\n`
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

export function getParser(rootNode: ProstoParserNode) {
    function getCode(source: string): string {
        const result = rootNode.parse(source)
        console.log(result.toTree())
        return 'const __ = []\n' + 
            'let __v = \'\'\n' +
            'with (__ctx__) {\n' +
            renderCode(result) +
            '}\n' +
            'return __.join(\'\')'
    }
    function getFunc(source: string) {
        return genSafeFunc(getCode(source))    
    }

    return {
        getCode,
        getFunc,
    }
}
