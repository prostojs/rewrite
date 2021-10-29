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
}

type TScope = Record<string, unknown>

export class ProstoRewrite {
    protected blockSign: string = '?!'

    protected revealSign: string = '?='

    protected interpolationDelimiters: [string, string] = ['{{=', '=}}']

    protected instructionSign: string = '?@'

    protected rg: RG

    constructor(options?: Partial<ProstoRewriteOptions>) {
        this.blockSign = escapeRegex(options?.blockSign || this.blockSign)
        this.revealSign = escapeRegex(options?.revealSign || this.revealSign)
        this.interpolationDelimiters = options?.interpolationDelimiters || this.interpolationDelimiters
        this.instructionSign = escapeRegex(options?.instructionSign || this.instructionSign)
        const commentPrefix = '^\\s*(?:#|\\/\\/)'
        this.rg = {
            if: new RegExp(`${commentPrefix}${this.blockSign}\\s+(if\\s*\\(.+)$`),
            elseif: new RegExp(`${commentPrefix}${this.blockSign}\\s+(\\}?\\s*else\\s+if\\s*\\(.+)$`),
            else: new RegExp(`${commentPrefix}${this.blockSign}\\s+(\\}?\\s*else\\s?.*)$`),
            for: new RegExp(`${commentPrefix}${this.blockSign}\\s+(for\\s*\\(.+)$`),
            end: new RegExp(`${commentPrefix}${this.blockSign}\\s+(\\}\\s*)$`),
            reveal: new RegExp(`${commentPrefix}${this.revealSign}(.+)$`),
            noInterpolate: new RegExp(`${commentPrefix}${this.instructionSign}\\sno-interpolate-next-line$`),
            noInterpolateFile: new RegExp(`${commentPrefix}${this.instructionSign}\\sno-interpolate-file$`),
            noRewriteFile: new RegExp(`${commentPrefix}${this.instructionSign}\\sno-rewrite$`),
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
        let noInterpolate = false
        let noInterpolateFile = false
        let noRewriteFile = false

        const safeScope: Record<string, unknown> = {
            ...(scope || {}),
            window: undefined,
            global: undefined,
            process: undefined,
        }

        const matched: Record<keyof RG, (v: string, i: number) => void> = {
            if: (v: string, i: number) => {
                lastOpenBlock = i
                const c = v.trim().replace(/\{$/, '')
                code += c + ' {\n'
                nestedCount++
            },
            elseif: (v: string, i: number) => {
                lastOpenBlock = i
                const c = v.trim().replace(/^\}/, '').replace(/\{$/, '')
                code += '} ' + c + ' {\n'
            },
            else: (v: string, i: number) => {
                lastOpenBlock = i
                const c = v.trim().replace(/^\}/, '').replace(/\{$/, '')
                code += '} ' + c + ' {\n'
            },
            for: (v: string, i: number) => {
                lastOpenBlock = i
                const c = v.trim().replace(/\{$/, '')
                code += c + ' {\n'
                nestedCount++
            },
            end: (v: string, i: number) => {
                nestedCount--
                if (nestedCount === 0) {
                    code += v + '\n'
                    const func = 'const lines = []\n' +
                        'with (__scope__) {\n' +
                        code + '\n' +
                        '}\n' +
                        'return lines.length ? lines.join(\'\\n\') : null\n'
                    const output = (new Function('__scope__', func))({ ...safeScope })
                    if (typeof output === 'string') {
                        target.push(output)
                    }
                    code = ''
                }
                if (nestedCount < 0) {
                    panic(sourceName, `Unexpected end of block at line ${i}:`, sourceLines[i])
                }
            },
            reveal: (v, i) => {
                if (!code) {
                    panic(sourceName, `Unexpected reveal expression at line ${i}:`, sourceLines[i])
                }
                const escaped = v.replace(/`/g, '\\`')
                code += `lines.push(\`${noInterpolate ? escaped : interpolateLine(escaped)}\`)\n`
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
                    panic(sourceName, `Interpolation of line ${i} failed: ${bold((e as Error).message)}`, sourceLines[i])
                }
            }
            noInterpolate = false
        }

        if (nestedCount !== 0) {
            panic(sourceName, `Missing end of block for line ${lastOpenBlock}.`, sourceLines[lastOpenBlock])
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
    return '<dye.bold>' + s + '<dye-off.bold>'
}
function dim(s: string) {
    return '<dye.dim>' + s + '<dye-off.dim>'
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
    console.log(
        '<dye.bg-red><dye.white> Rewrite ERROR <dye.reset>\n',
        ...args.map(a => '<dye.red>' + a),
        '<dye.reset>\n'
    )
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
