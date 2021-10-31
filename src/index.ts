import { getTextParser } from './parsers/text-template'
import { TProstoRewriteOptions, RG, TProstoRewriteDirOptions, TRenderedFunction, TRenderFunction, TRewriteTemplate, TScope } from './types'
import { bold, escapeRegex, panic, parseErrorStack, printError, renderCodeFragment } from './utils'

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export class ProstoRewrite {
    protected blockSign: string = '='

    protected revealSign: string = ':'

    protected interpolationDelimiters: [string, string] = ['{{=', '=}}']

    protected instructionSign: string = '@rw:'

    protected rg: RG

    protected lineInterpolator: (line: string) => string

    constructor(options?: Partial<TProstoRewriteOptions>) {
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
        this.lineInterpolator = getTextParser(this.interpolationDelimiters)
    }

    public generateFunctionFromFile = __NODE_JS__ ? async (filePath: string): Promise<TRewriteTemplate> => {
        const fs = await import('fs')
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (yes) => {
                if (yes) {
                    fs.readFile(filePath, (err, file) => {
                        if (err) return reject(err)
                        resolve(this.generateFunction(file.toString(), filePath))
                    })
                } else {
                    reject('File ' + filePath + ' does not exist')
                }
            })
        })
    } : async (_filePath: string): Promise<TRewriteTemplate> => {
        printError('Method "renderFile" only supported on NodeJS build.')
        return new Promise((_resolve, reject) => reject('Method "generateFunctionFromFile" only supported on NodeJS build.'))
    }

    public renderFile = __NODE_JS__ ? async (filePath: string, scope?: TScope, targetPath?: string): Promise<string> => {
        const fs = await import('fs')
        const f = await this.generateFunctionFromFile(filePath)
        const result = f(scope)
        if (targetPath) {
            const path = await import('path')
            const dirname = path.dirname(targetPath)
            await fs.promises.mkdir(dirname, { recursive: true })
            await fs.promises.writeFile(targetPath, result)
        }
        return result
    } : (_filePath: string, _scope?: TScope, _targetPath?: string): Promise<string> => {
        printError('Method "renderFile" only supported on NodeJS build.')
        return new Promise((_resolve, reject) => reject('Method "renderFile" only supported on NodeJS build.'))
    }

    public renderDir = __NODE_JS__ ? async (opts: TProstoRewriteDirOptions): Promise<Record<string, string>> => {
        const path = await import('path')
        const fs = await import('fs')
        const d = path.resolve(opts.path)
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
        for await (const f of getFiles(opts.path)) {
            const relF = f.slice(d.length)
            let targetPath 
            if (opts.output) {
                targetPath = path.join(opts.output, relF)
            }
            const content = await this.renderFile(f, opts.scope, targetPath)
            if (typeof opts.onFileRendered === 'function') {
                opts.onFileRendered(f, content)
            }
        }
        return result
    } : (_opts: TProstoRewriteDirOptions): Promise<Record<string, string>> => {
        printError('Method "renderDir" only supported on NodeJS build.')
        return new Promise((_resolve, reject) => reject('Method "renderDir" only supported on NodeJS build.'))
    }

    public render(source: string, scope?: TScope, sourceName?: string): string {
        return this.generateFunction(source, sourceName)(scope)
    }

    genInlineFunction(line: string): TRenderedFunction | string {
        if (line.indexOf(this.interpolationDelimiters[0]) >= 0) {
            const s = this.lineInterpolator(line)
            let code = 'with (__scope__) {\n'
            code += '  return `' + s + '`\n}\n'
            return {
                code,
                render: new Function('__scope__', code) as TRenderFunction,
            }
        }
        return line
    }
    
    getInterpolationExpression(line: string): string {
        if (line.indexOf(this.interpolationDelimiters[0]) >= 0) {
            return this.lineInterpolator(line)
        }
        return line
    }

    public generateFunction(source: string, sourceName?: string): TRewriteTemplate {
        const sourceLines = source.split('\n')
        const target: (string | TRenderedFunction)[] = []
        const tokens: (keyof RG)[] = Object.keys(this.rg) as (keyof RG)[]
        let code = ''
        let nestedCount = 0
        let lastOpenBlock = 0
        const startBlockIndex: number[] = []
        const blockStack: (keyof RG)[] = []
        let noInterpolate = false
        let noInterpolateFile = false
        let noRewriteFile = false

        function indent(n = nestedCount) {
            return ' '.repeat(n * 2 + 2)
        }

        function pushTarget(item: string | TRenderedFunction) {
            if (typeof item === 'string' && typeof target[target.length - 1] === 'string') {
                target[target.length - 1] += '\n' + item
            } else {
                target.push(item)
            }
        }

        const matched: Record<keyof RG, (v: string, i: number) => void> = {
            if: (v: string, i: number) => {
                startBlockIndex.push(i)
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
            else: (_v: string, i: number) => {
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
                startBlockIndex.push(i)
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
                const prevBlockIndex = startBlockIndex.pop() || 0
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
                    const func = 'const lines = []\n' +
                        'with (__scope__) {\n' +
                        code +
                        '}' + 
                        'return lines.length ? lines.join(\'\\n\') : null\n'
                    try {
                        pushTarget({
                            code: func,
                            render: new Function('__scope__', func) as TRenderFunction,
                        })
                    } catch (e) {
                        panic(
                            sourceName,
                            `Block interpolation error: ${ bold( (e as Error).message) }.`,
                            renderCodeFragment(sourceLines, prevBlockIndex, undefined, i)
                        )
                    }
                    code = ''
                }
            },
            reveal: (v, i) => {
                if (!code) {
                    panic(sourceName, `Unexpected reveal expression at line ${i + 1}:`, renderCodeFragment(sourceLines, i))
                }
                const escaped = v.replace(/`/g, '\\`')
                code += indent() + `lines.push(\`${noInterpolate ? escaped : this.getInterpolationExpression(escaped)}\`)\n`
            },
            blockPrefix: (_v, i) => {
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
            if (noRewriteFile) return () => source
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
                    pushTarget((noInterpolate || noInterpolateFile) ? line : this.genInlineFunction(line))
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

        return (scope?: TScope): string => {
            const safeScope: Record<string, unknown> = {
                ...(scope || {}),
                window: undefined,
                global: undefined,
                process: undefined,
            }
            const result: string[] = []
            for (let i = 0; i < target.length; i++) {
                const line = target[i]
                if (typeof line === 'object') {
                    let v: string | null = null
                    try {
                        v = line.render(safeScope)
                    } catch (e) {
                        panic(sourceName, `Block interpolation error: ${ bold( (e as Error).message) }`, parseErrorStack(e as Error, line.code))
                    }
                    if (v) {
                        result.push(v)
                    }
                } else {
                    result.push(line)
                }
            }
            return result.join('\n')
        }
    }
}

