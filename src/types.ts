import { ProstoParserNodeContext } from '@prostojs/parser'

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

export type TRewriteCodeFactory<T> = (context: ProstoParserNodeContext<T>, level?: number) => string

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
    genRewriteFunction: (source: string) => (scope?: TProstoRewriteScope) => string
    printAsTree: (source: string) => void
    rewrite: (source: string, scope?: TProstoRewriteScope) => string
}

export type TProstoRewriteScope = Record<string, unknown>
