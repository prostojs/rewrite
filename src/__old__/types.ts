export interface TProstoRewriteOptions {
    blockSign: string
    revealSign: string
    interpolationDelimiters: [string, string]
    instructionSign: string
    htmlAttributeSign: string
    htmlInstructionSign: string
}

export interface TProstoRewriteDirOptions {
    path: string
    scope?: TScope
    onFileRendered?: (path: string, result: string) => void
    output?: string
}

export interface RG {
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

export interface RG2 {
    if: RegExp
    endif1: RegExp
    endif2: RegExp
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

export type TScope = Record<string, unknown>
export type TRenderFunction = (scope?: TScope) => string | null
export interface TRenderedFunction {
    code: string
    render: TRenderFunction
}
export type TRewriteTemplate = (scope?: TScope) => string

export const enum ENode {
    DOCUMENT,
    DOCTYPE,
    TAG,
    VOID_TAG,
    ATTRIBUTE,
    VALUE,
    INNER,
    COMMENT,
    INTERPOLATION_ATTRIBUTE,
    INSTRUCTION_ATTRIBUTE,
    
    EXPRESSION,
    STRING,

    TEXTFILE,
    TEXTLINE,

    BLOCK,
    BLOCK_IF,
    BLOCK_ELSE,
    BLOCK_ELSEIF,
    BLOCK_FOR,
    BLOCK_ENDFOR,
    BLOCK_ENDIF,

    INSTRUCTION,
    NO_INTERPOLATE,
    IGNORED_LINE,
    REVEAL,
}
