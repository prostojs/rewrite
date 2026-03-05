import { htmlTextTags, htmlVoidTags } from './constants'
import {
    copyFile,
    pathJoin,
    pathResolve,
    readDir,
    readFile,
    writeFile,
} from './files'
import { getRewriter } from './rw-common'
import { getHtmlParser, getHtmlRewriter } from './rw-html-parser'
import { getTextParser, getTextRewriter } from './rw-text-parser'
import {
    TProstoRewriteContext,
    TProstoRewriter,
    TRewriteCommonOptions,
    TRewriteDirOptions,
    TRewriteFileOptions,
    TRewriteMode,
    TRewriteOptions,
    TRewriteOptionsPublic,
} from './types'
import { Minimatch } from 'minimatch'
import { debug } from './utils'
export * from './types'
export * from './rw-common'

const defaultDelimiters: TRewriteCommonOptions['exprDelimiters'] = ['{{', '}}']

export class ProstoRewrite {
    protected options: TRewriteOptions
    private _mixedRewriter?: { text: TProstoRewriter; html: TProstoRewriter }
    private _textRewriter?: TProstoRewriter
    private _htmlRewriter?: TProstoRewriter

    constructor(options?: TRewriteOptionsPublic) {
        this.options = {
            defaultMode: options?.defaultMode || 'auto',
            debug: options?.debug || false,
            htmlPattern: __NODE_JS__
                ? (options?.htmlPattern || ['*.{html,xhtml,xml,svg}']).map(
                      (p) => new Minimatch(p, { matchBase: true }),
                  )
                : [],
            textPattern: __NODE_JS__
                ? (
                      options?.textPattern || [
                          '*.{js,jsx,ts,tsx,txt,json,yml,yaml,md,ini}',
                          'Dockerfile',
                          '*config',
                          '.gitignore',
                      ]
                  ).map((p) => new Minimatch(p, { matchBase: true }))
                : [],
            html: {
                exprDelimiters: defaultDelimiters,
                attrExpression: ':',
                blockOperation: 'v-',
                directive: '!@',
                voidTags: options?.html?.voidTags || htmlVoidTags,
                textTags: options?.html?.textTags || htmlTextTags,
                ...options?.html,
            },
            text: {
                exprDelimiters: defaultDelimiters,
                blockOperation: '=',
                revealLine: ':',
                directive: '!@',
                ...options?.text,
            },
        }
    }

    get mixedRewriter() {
        if (!this._mixedRewriter) {
            const textNodes = getTextParser(this.options.text, true)
            const htmlNodes = getHtmlParser(this.options.html, true)
            textNodes.htmlDirectiveNode.recognize(
                ...htmlNodes.rootNode.recognizes,
            )
            htmlNodes.textDirectiveNode.recognize(
                ...textNodes.rootNode.recognizes,
            )
            this._mixedRewriter = {
                text: getRewriter(textNodes.rootNode, this.options.debug),
                html: getRewriter(htmlNodes.rootNode, this.options.debug),
            }
        }
        return this._mixedRewriter
    }

    get textRewriter() {
        if (!this._textRewriter) {
            this._textRewriter = getTextRewriter(this.options.text, this.options.debug)
        }
        return this._textRewriter
    }

    get htmlRewriter() {
        if (!this._htmlRewriter) {
            this._htmlRewriter = getHtmlRewriter(this.options.html, this.options.debug)
        }
        return this._htmlRewriter
    }

    public async rewriteFile(
        opts: TRewriteFileOptions,
        context?: TProstoRewriteContext,
    ) {
        const file = await readFile(opts.input)
        const mode = this.determineMode(
            opts.mode || this.options.defaultMode,
            opts.input,
            file,
        )
        let output = file
        if (mode) {
            this.debug(
                'Parsing file in ' +
                    mode +
                    ' mode. ' +
                    __DYE_UNDERSCORE__ +
                    __DYE_BOLD_OFF__ +
                    opts.input,
            )
            output = this.mixedRewriter[mode].rewrite(file, context)
        } else {
            this.debug(
                "File isn't recognized as text nor as html. " +
                    __DYE_UNDERSCORE__ +
                    __DYE_BOLD_OFF__ +
                    opts.input,
            )
        }
        if (opts.output) {
            if (mode) {
                await writeFile(opts.output, output)
                this.debug(
                    'File has been rewritten in ' +
                        mode +
                        ' mode. ' +
                        __DYE_UNDERSCORE__ +
                        __DYE_BOLD_OFF__ +
                        opts.output,
                )
            } else {
                await copyFile(opts.input, opts.output)
                this.debug(
                    'File rewriting was skipped. File copied. ' +
                        __DYE_UNDERSCORE__ +
                        __DYE_BOLD_OFF__ +
                        opts.output,
                )
            }
        }
        return output
    }

    public async rewriteDir(
        opts: TRewriteDirOptions,
        context?: TProstoRewriteContext,
    ) {
        if (__BROWSER__) return
        const files = await readDir(opts.baseDir)
        const dirPath = await pathResolve(opts.baseDir)
        const include =
            opts.include && opts.include.length
                ? opts.include.map((s) => new Minimatch(s, { matchBase: true }))
                : null
        const exclude =
            opts.exclude && opts.exclude.length
                ? opts.exclude.map((s) => new Minimatch(s, { matchBase: true }))
                : null
        const rename = opts.renameFile || ((f) => f)
        for await (const filePath of files) {
            let included = true
            let excluded = false
            if (include) included = !!include.find((m) => m.match(filePath))
            if (exclude && included)
                excluded = !!exclude.find((m) => m.match(filePath))
            if (!included || excluded) continue
            const relativeFilePath = rename(filePath.slice(dirPath.length + 1))
            let targetPath
            if (opts.output) {
                targetPath = await pathJoin(opts.output, relativeFilePath)
            }
            const output = await this.rewriteFile(
                {
                    mode: opts.mode,
                    input: filePath,
                    output: targetPath,
                },
                context,
            )
            if (opts.onFile) {
                opts.onFile(filePath, output)
            }
            // yield { filePath, output }
        }
    }

    private determineMode(
        mode: TRewriteMode,
        path: string,
        content: string,
    ): 'text' | 'html' | void {
        if (mode === 'text') return 'text'
        if (mode === 'html') return 'html'
        if (mode === 'auto') {
            const isText = !!this.options.textPattern.find((m) => m.match(path))
            const isHtml = !!this.options.htmlPattern.find((m) => m.match(path))
            if (isText && isHtml) {
                if (/^<!DOCTYPE\s/.test(content)) return 'html'
                if (/^<\?xml\s/.test(content)) return 'html'
                return 'text'
            }
            if (isText) return 'text'
            if (isHtml) return 'html'
        }
    }

    private debug(message: string) {
        if (!this.options.debug) return
        debug(message)
    }
}
