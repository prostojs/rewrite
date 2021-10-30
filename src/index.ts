/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export interface ProstoRewriteOptions {
    blockSign: string
    revealSign: string
    interpolationDelimiters: [string, string]
    instructionSign: string
}

interface RG {
    if: RegExp
    elseif: RegExp
    else: RegExp
    for: RegExp
    end: RegExp
    reveal: RegExp
    noInterpolate: RegExp
    noInterpolateFile: RegExp
    noRewriteFile: RegExp
    blockPrefix: RegExp
}

type TScope = Record<string, unknown>

export class ProstoRewrite {
    protected blockSign: string = '='

    protected revealSign: string = ':'

    protected interpolationDelimiters: [string, string] = ['{{=', '=}}']

    protected instructionSign: string = '@rw:'

    protected rg: RG

    constructor(options?: Partial<ProstoRewriteOptions>) {
        this.blockSign = escapeRegex(options?.blockSign || this.blockSign)
        this.revealSign = escapeRegex(options?.revealSign || this.revealSign)
        this.interpolationDelimiters = options?.interpolationDelimiters || this.interpolationDelimiters
        this.instructionSign = escapeRegex(options?.instructionSign || this.instructionSign)
        const commentPrefix = '^\\s*(?:#|\\/\\/)'
        this.rg = {
            if:     new RegExp(`${commentPrefix}${this.blockSign}\\s*IF\\s*\\((.+)\\)\\s*$`),
            elseif: new RegExp(`${commentPrefix}${this.blockSign}\\s*ELSE\\s+IF\\s*\\((.+)\\)\\s*$`),
            else:   new RegExp(`${commentPrefix}${this.blockSign}\\s*ELSE\\s*$`),
            for:    new RegExp(`${commentPrefix}${this.blockSign}\\s*FOR\\s*\\((.+)\\)\\s*$`),
            end:    new RegExp(`${commentPrefix}${this.blockSign}\\s*END\\s*([A-Z]+)\\s*$`),
            reveal: new RegExp(`${commentPrefix}${this.revealSign}(.+)$`),
            noInterpolate:      new RegExp(`${commentPrefix}\\s*${this.instructionSign}no-interpolate-next-line$`, 'i'),
            noInterpolateFile:  new RegExp(`${commentPrefix}\\s*${this.instructionSign}no-interpolate-file$`, 'i'),
            noRewriteFile:      new RegExp(`${commentPrefix}\\s*${this.instructionSign}no-rewrite$`, 'i'),
            blockPrefix: new RegExp(`${commentPrefix}${this.blockSign}(.+)$`),
        }
    }

    renderFile = __NODE_JS__ ? async (filePath: string, scope?: TScope, targetPath?: string): Promise<string> => {
        const fs = await import('fs')
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (yes) => {
                if (yes) {
                    fs.readFile(filePath, (err, file) => {
                        if (err) return reject(err)
                        const result: string = this.render(file.toString(), scope, filePath)
                        if (targetPath) {
                            fs.writeFile(targetPath, result, (err) => {
                                if (err) return reject(err)
                                resolve(result)
                            })
                        } else {
                            resolve(result)
                        }
                    })
                } else {
                    reject('File ' + filePath + ' does not exist')
                }
            })
        })
    } : (filePath: string, scope?: TScope, targetPath?: string): Promise<string> => {
        printError('Method "renderFile" only supported on NodeJS build.')
        return new Promise((resolve, reject) => reject('Method "renderFile" only supported on NodeJS build.'))
    }

    renderDir = __NODE_JS__ ? async (opts: TProstoRewriteDirOptions): Promise<Record<string, string>> => {
        const path = await import('path')
        const fs = await import('fs')
        const d = path.resolve(opts.dirPath)
        async function* getFiles(dir: string): AsyncGenerator<string> {
            const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
            for (const dirent of dirents) {
                const res = path.resolve(dir, dirent.name)
                if (dirent.isDirectory()) {
                    yield* getFiles(res)
                } else {
                    yield res
                }
            }
        }
        const result: Record<string, string> = {}
        for await (const f of getFiles(opts.dirPath)) {
            const relF = f.slice(d.length)
            let targetPath 
            if (opts.targetDirPath) {
                targetPath = path.join(opts.targetDirPath, relF)
                const dirname = path.dirname(targetPath)
                await fs.promises.mkdir(dirname, { recursive: true })
            }
            const content = await this.renderFile(f, opts.scope, targetPath)
            if (opts.onFile) {
                opts.onFile(f, content)
            }
        }
        return result
    } : (opts: TProstoRewriteDirOptions): Promise<Record<string, string>> => {
        printError('Method "renderDir" only supported on NodeJS build.')
        return new Promise((resolve, reject) => reject('Method "renderDir" only supported on NodeJS build.'))
    }

    render(source: string, scope?: TScope, sourceName?: string): string {
        const sourceLines = source.split('\n')
        const target = []
        const tokens: (keyof RG)[] = Object.keys(this.rg) as (keyof RG)[]
        let code = ''
        let nestedCount = 0
        let lastOpenBlock = 0
        const blockStack: (keyof RG)[] = []
        let noInterpolate = false
        let noInterpolateFile = false
        let noRewriteFile = false

        const safeScope: Record<string, unknown> = {
            ...(scope || {}),
            window: undefined,
            global: undefined,
            process: undefined,
        }
        const safeScopeKeys = Object.keys(safeScope)
        const safeScopeValues = safeScopeKeys.map(k => safeScope[k])

        function indent(n = nestedCount) {
            return ' '.repeat(n * 2)
        }

        const matched: Record<keyof RG, (v: string, i: number) => void> = {
            if: (v: string, i: number) => {
                lastOpenBlock = i
                blockStack.push('if')
                code += indent()
                code += 'if (' + v.trim() + ') {\n'
                nestedCount++
            },
            elseif: (v: string, i: number) => {
                lastOpenBlock = i
                const prevBlock = blockStack.pop() || ''
                if (!['if', 'elseif'].includes(prevBlock)) {
                    panic(sourceName, `Unexpected "ELSE IF" at line ${ i + 1 }.`, renderCodeFragment(sourceLines, i))
                }
                blockStack.push('elseif')
                code += indent(nestedCount - 1)
                code += '} else if (' + v.trim() + ') {\n'
            },
            else: (v: string, i: number) => {
                lastOpenBlock = i
                const prevBlock = blockStack.pop() || ''
                if (!['if', 'elseif'].includes(prevBlock)) {
                    panic(sourceName, `Unexpected "ELSE" at line ${ i + 1 }. Previous block was ${ prevBlock?.toUpperCase() || 'NONE' }.`, renderCodeFragment(sourceLines, i))
                }
                blockStack.push('else')
                code += indent(nestedCount - 1)
                code += '} else {\n'
            },
            for: (v: string, i: number) => {
                lastOpenBlock = i
                blockStack.push('for')
                code += indent()
                code += 'for (' + v.trim() + ') {\n'
                nestedCount++
            },
            end: (v: string, i: number) => {
                nestedCount--
                if (nestedCount < 0) {
                    panic(sourceName, `Unexpected end of block at line ${i + 1}:`, renderCodeFragment(sourceLines, i))
                }
                const prevBlock = blockStack.pop() || ''
                if (['if', 'elseif', 'else'].includes(prevBlock)) {
                    if (v !== 'IF') {
                        panic(sourceName, `Wrong closing block statement at line ${ i + 1 }. Expected END IF.`, renderCodeFragment(sourceLines, i))
                    }
                } else if (v !== prevBlock.toUpperCase()) {
                    panic(sourceName, `Wrong closing block statement at line ${ i + 1 }. Expected END ${ prevBlock.toUpperCase() }.`, renderCodeFragment(sourceLines, i))
                }
                code += indent()
                code += '}\n'
                if (nestedCount === 0) {
                    const func = '"use strict";\nconst lines = []\n' +
                        code +
                        'return lines.length ? lines.join(\'\\n\') : null\n'
                    try {
                        const output = (new Function(...safeScopeKeys, func))(...safeScopeValues)
                        if (typeof output === 'string') {
                            target.push(output)
                        }
                    } catch (e) {
                        panic(sourceName, `Block interpolation error: ${ bold( (e as Error).message) }`, parseErrorStack(e as Error, func))
                    }
                    code = ''
                }
            },
            reveal: (v, i) => {
                if (!code) {
                    panic(sourceName, `Unexpected reveal expression at line ${i + 1}:`, renderCodeFragment(sourceLines, i))
                }
                const escaped = v.replace(/`/g, '\\`')
                code += indent() + `lines.push(\`${noInterpolate ? escaped : interpolateLine(escaped)}\`)\n`
            },
            blockPrefix: (v, i) => {
                panic(sourceName, `Unrecognized block statement at line ${i + 1}:`, renderCodeFragment(sourceLines, i))
            },
            noInterpolate: () => {
                noInterpolate = true
            },
            noInterpolateFile: () => {
                noInterpolateFile = true
            },
            noRewriteFile: () => {
                noRewriteFile = true
            },
        }

        for (let i = 0; i < sourceLines.length; i++) {
            if (noRewriteFile) return source
            const line = sourceLines[i]
            let skip = false
            for (let j = 0; j < tokens.length; j++) {
                const token: keyof RG = tokens[j]
                const match = this.rg[token].exec(line)
                if (match) {
                    matched[token](match[1], i)
                    skip = true
                    break
                }
            }
            if (skip) continue
            if (code) {
                matched.reveal(line, i)
            } else {
                try {
                    target.push((noInterpolate || noInterpolateFile) ? line : interpolateLine(line, safeScope))
                } catch (e) {
                    panic(sourceName, `Interpolation of line ${i + 1} failed: ${bold((e as Error).message)}`, renderCodeFragment(sourceLines, i))
                }
            }
            noInterpolate = false
        }

        if (nestedCount !== 0) {
            const prevBlock = blockStack.pop() as string
            panic(sourceName, `Missing end of block for line ${ lastOpenBlock + 1 }. Expected END ${ prevBlock.toUpperCase() }.`, renderCodeFragment(sourceLines, lastOpenBlock))
        }

        return target.join('\n')
    }
}

export interface TProstoRewriteDirOptions {
    dirPath: string
    scope?: TScope
    onFile?: (path: string, result: string) => void
    targetDirPath?: string
}

function bold(s: string) {
    return __DYE_BOLD__ + s + __DYE_BOLD_OFF__
}
function dim(s: string) {
    return __DYE_DIM__ + s + __DYE_DIM_OFF__
}

function panic(sourceName: string | undefined, message: string, line: string, details?: string) {
    printError(
        'Failed to render ' + bold(sourceName || 'source') + '\n',
        message + '\n',
        dim(line) + '\n',
        details ? details + '\n' : ''
    )
    throw new Error('Failed to render ' + (sourceName || 'source'))
}

function printError(...args: string[]) {
    console.error(
        __DYE_BG_RED__ + __DYE_WHITE__ + 
        ' Rewrite ERROR ' + __DYE_RESET__,
        ...args.map(a => __DYE_RED__ + a),
        __DYE_RESET__ + '\n'
    )
}

function renderCodeFragment(lines: string[], row: number, col?: number) {
    function renderLine(n:number, isError = false): string {
        let line = lines[n] || ''
        const lineColor = (isError ? __DYE_BLUE_BRIGHT__ : __DYE_BLUE__)
        if (isError) {
            const l = getErrorLength()
            const c = col || 0
            line = line.slice(0, c) + __DYE_RED__ + __DYE_BOLD__ + line.slice(c, c + l) + __DYE_RESET__ + lineColor + line.slice(c + l)
        }
        return lineNumber(n + 1, isError) + lineColor + line + __DYE_COLOR_OFF__
    }
    function renderError(): string {
        return lineNumber(undefined, true) + __DYE_RED__ + ' '.repeat(col || 0) + '^'.repeat(getErrorLength() || 1) + __DYE_RESET__
    }
    function getErrorLength() {
        let l: number = lines[row].length
        if (col) {
            l = (/[\.-\s\(\)\*\/\+\{\}\[\]\?\'\"\`\<\>]/.exec(lines[row].slice(col + 1)) || { index: l - col }).index + 1
        }
        return l
    }
    return renderLine(row - 2) +
           renderLine(row - 1) +
           renderLine(row, true) +
           renderError() +
           renderLine(row + 1) +
           renderLine(row + 2)
}

function parseErrorStack(e: Error, func: string): string {
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

function lineNumber (i?: number, isError = false) {
    let s = '       '
    if (i && i > 0) {
        s = '     ' + String(i)
    }
    s = s.slice(s.length - 4)
    return '\n' + __DYE_RESET__ + (isError ? __DYE_RED__ + __DYE_BOLD__ : __DYE_DIM__) + s + '│ ' + __DYE_RESET__
}

function interpolateLine(line: string, scope?: TScope): string {
    if (scope) {
        if (line.indexOf('{{=') >= 0) {
            const func = 'with (__scope__) {\n' +
                'return `' + interpolateLine(line.replace(/`/g, '\\`')) + '`' +
                '}\n'

            return new Function('__scope__', func)(scope) as string
        }
        return line
    }
    return line.replace(/\{\{?=/g, '${').replace(/=\}\}/g, '}')
}

function escapeRegex(s: string): string {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
