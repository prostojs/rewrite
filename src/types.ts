import { ProstoParserNodeContext, TGenericCustomDataType } from '@prostojs/parser'
import { Minimatch } from 'minimatch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TRewriteNodeType<T extends { code: TRewriteCodeFactory<any> } = { code: TRewriteCodeFactory<any> }> {
    code: TRewriteCodeFactory<T>
    openCode?: string
    closeCode?: string
}

export type TStringNodeData = { quote: string }

export interface TStringExpressionData extends TRewriteNodeType<TStringExpressionData> {
    expression: string,
}

export type TRewriteCodeFactory<T extends TGenericCustomDataType> = (context: ProstoParserNodeContext<T>, level?: number) => string

export interface TValueNodeCustomData {
    quote: string
}

export interface TAttrNodeCustomData extends TRewriteNodeType<TAttrNodeCustomData> {
    key: string
    value?: string
    quote?: string
}

export type THTMLBlockOperations = 'if' | 'for' | 'else' | 'else-if'

export interface TTagNodeCustomData extends TRewriteNodeType<TTagNodeCustomData> {
    isText?: boolean
    isVoid?: boolean
    operation?: THTMLBlockOperations
    tag: string
    endTag?: string
    operations?: TAttrNodeCustomData[]
    attrs?: TAttrNodeCustomData[]
}

export interface THTMLBlockDescr {
    key: THTMLBlockOperations
    exprRequired?: boolean
    compatible?: THTMLBlockOperations[]
    opening?: boolean
    overtakes?: THTMLBlockOperations[]
    closingKey?: string
    renderOpen: (v?: string) => string
}

export interface TProstoRewriter {
    genRewriteCode: (source: string) => string
    genRewriteFunction: (source: string) => (context?: TProstoRewriteContext) => string
    printAsTree: (source: string) => void
    rewrite: (source: string, context?: TProstoRewriteContext) => string
}

export type TProstoRewriteContext = Record<string, unknown>

export interface TRewriteCommonOptions {
    exprDelimeters: [string, string]
    blockOperation: string
    directive: string
}

export interface TRewriteHtmlOptions extends TRewriteCommonOptions {
    attrExpression: string
    voidTags: string[]
    textTags: string[]
}

export interface TRewriteTextOptions extends TRewriteCommonOptions {
    revealLine: string
}

export interface TRewriteOptions {
    defaultMode: TRewriteMode;
    debug: boolean;
    htmlPattern: Minimatch[];
    textPattern: Minimatch[];
    html: TRewriteHtmlOptions;
    text: TRewriteTextOptions;
}

export type TRewriteMode = 'html' | 'text' | 'auto'

export interface TRewriteOptionsPublic {
    defaultMode?: TRewriteMode
    debug?: boolean
    htmlPattern?: string[]
    textPattern?: string[]
    html?: Partial<TRewriteHtmlOptions>
    text?: Partial<TRewriteTextOptions>
}

export interface TRewriteFileOptions {
    input: string
    output?: string
    mode?: TRewriteMode
}

export interface TRewriteDirOptions {
    baseDir: string
    include?: string[]
    exclude?: string[]
    output?: string
    mode?: TRewriteMode
    onFile?: (path: string, output: string) => void
    renameFile?: (filename: string) => string
}
