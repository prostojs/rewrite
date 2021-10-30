import { TRenderedFunction, TRenderFunction } from './types'

export function bold(s: string) {
    return __DYE_BOLD__ + s + __DYE_BOLD_OFF__
}

export function dim(s: string) {
    return __DYE_DIM__ + s + __DYE_DIM_OFF__
}

export function panic(sourceName: string | undefined, message: string, line: string, details?: string) {
    printError(
        'Failed to render ' + bold(sourceName || 'source') + '. ' + __DYE_UNDERSCORE__ +  message + __DYE_UNDERSCORE_OFF__,
        '\n' + dim(line),
        details ? '\n' + details : ''
    )
    throw new Error('Failed to render ' + (sourceName || 'source'))
}

export function printError(...args: string[]) {
    console.error(
        __DYE_BG_RED__ + __DYE_WHITE__ + 
        ' Rewrite ERROR ' + __DYE_RESET__,
        ...args.map(a => __DYE_RED__ + a),
        __DYE_RESET__ + '\n'
    )
}

export function renderCodeFragment(lines: string[], row: number, col?: number, rowTo?: number) {
    const noError = !!rowTo
    function renderLine(n:number, isError = false): string {
        let line = lines[n] || ''
        const lineColor = (isError && !noError ? __DYE_BLUE_BRIGHT__ : __DYE_BLUE__)
        if (isError) {
            const l = getErrorLength()
            const c = col || 0
            line = line.slice(0, c) + (noError ? '' : __DYE_RED__) + __DYE_BOLD__ + line.slice(c, c + l) + __DYE_RESET__ + lineColor + line.slice(c + l)
        }
        return lineNumber(n + 1, isError && !noError) + lineColor + line + __DYE_COLOR_OFF__
    }
    function renderError(): string {
        return lineNumber(undefined, true && !noError) + __DYE_RED__ + ' '.repeat(col || 0) + '~'.repeat(getErrorLength() || 1) + __DYE_RESET__
    }
    function getErrorLength() {
        let l: number = lines[row].length
        if (col) {
            l = (/[\.-\s\(\)\*\/\+\{\}\[\]\?\'\"\`\<\>]/.exec(lines[row].slice(col + 1)) || { index: l - col }).index + 1
        }
        return l
    }
    let output = ''
    if (rowTo) {
        const delta = rowTo - row
        if (delta > 9) {
            for (let i = 0; i <= 9; i++) {
                if (i < 4) {
                    output += renderLine(row + i - 1, i === 1)
                } else if (i === 4) {
                    output += renderLine(row + i - 1) + '\n  ...\n'
                } else {
                    output += renderLine(rowTo - 8 + i, i === 8)
                }
            }
            return output
        } else {
            for (let i = row - 1; i <= rowTo + 1; i++) {
                output += renderLine(i, i === row || i === rowTo)
            }
            return output
        }
    } else {
        output += renderLine(row - 2) + renderLine(row - 1) + renderLine(row, true) +
                (noError ?  '' : renderError()) + renderLine(row + 1) + renderLine(row + 2)
    }
    return output           
}

export function parseErrorStack(e: Error, func: string): string {
    const relevantLine = e.stack?.split('\n')[1] || ''
    const regex = /<anonymous>:(\d+):(\d+)\)/g
    const match = regex.exec(relevantLine)
    if (match) {
        const row = parseInt(match[1], 10)
        const col = parseInt(match[2], 10)
        return renderCodeFragment(func.split('\n'), row - 3, Math.max(col - 1, 0))
    } else {
        return ''
    }
}

export function lineNumber (i?: number, isError = false) {
    let s = '       '
    if (i && i > 0) {
        s = '     ' + String(i)
    }
    s = s.slice(s.length - 4)
    return '\n' + __DYE_RESET__ + (isError ? __DYE_RED__ + __DYE_BOLD__ : __DYE_DIM__) + s + '│ ' + __DYE_RESET__
}

export function genInlineFunction(line: string): TRenderedFunction | string {
    if (line.indexOf('{{=') >= 0) {
        const code = 'with (__scope__) {\n' +
            'return `' + getInterpolationExpression(line.replace(/`/g, '\\`')) + '`' +
            '}\n'
        return {
            code,
            render: new Function('__scope__', code) as TRenderFunction,
        }
    }
    return line
}

export function getInterpolationExpression(line: string): string {
    return line.replace(/\{\{?=/g, '${').replace(/=\}\}/g, '}')
}

export function escapeRegex(s: string): string {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
