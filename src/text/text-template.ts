import { ProstoParser } from '@prostojs/parser'
import { stringExpressionNode } from '../parsers/node-string-expression'
import { ENode, RG, RG2 } from '../types'
import { TProstoRewriteOptions } from '../types'
import { escapeRegex } from '../utils'
import { blockNode } from './node-block'
import { blockElseNode } from './node-block-else'
import { blockElseIfNode } from './node-block-elseif'
import { blockIfNode } from './node-block-if'
import { ignoredLineNode } from './node-ignored-line'
import { instructionNode } from './node-instruction'
import { noInterpolateNode } from './node-no-interpolate'
import { revealNode } from './node-reveal'
import { textfileNode } from './node-textfile'

export const getTextParser = (options: TProstoRewriteOptions) => {
    const blockSign = escapeRegex(options?.blockSign || '=')
    const revealSign = escapeRegex(options?.revealSign || ':')
    const interpolationDelimiters = options?.interpolationDelimiters || ['{{=', '=}}']
    const instructionSign = escapeRegex(options?.instructionSign || '@rw:')
    const commentPrefix = '^\\n\\s*(?:#|\\/\\/)'
    const rg: RG2 = {
        if:     new RegExp(`${commentPrefix}${blockSign}\\s*IF\\s*\\((.+)\\)\\s*\\n`),
        endif1:  new RegExp(`${commentPrefix}${blockSign}\\s*(?:ELSE\\s+IF|ELSE|END\\s*IF)\\s?[^\\n]*`),
        endif2:  new RegExp(`${commentPrefix}${blockSign}\\s*END\\s*IF\\s?[^\\n]*`),
        elseif: new RegExp(`${commentPrefix}${blockSign}\\s*ELSE\\s+IF\\s*\\((.+)\\)\\s*\\n`),
        else:   new RegExp(`${commentPrefix}${blockSign}\\s*ELSE\\s*\\n`),
        for:    new RegExp(`${commentPrefix}${blockSign}\\s*FOR\\s*\\((.+)\\)\\s*$`),
        end:    new RegExp(`${commentPrefix}${blockSign}\\s*END\\s*([A-Z]+)\\s*$`),
        reveal: new RegExp(`${commentPrefix}${revealSign}(.+)$`),
        noInterpolate:      new RegExp(`${commentPrefix}\\s*${instructionSign}no-interpolate-next-line$`, 'i'),
        noInterpolateFile:  new RegExp(`${commentPrefix}\\s*${instructionSign}no-interpolate-file$`, 'i'),
        noRewriteFile:      new RegExp(`${commentPrefix}\\s*${instructionSign}no-rewrite$`, 'i'),
        blockPrefix: new RegExp(`${commentPrefix}${blockSign}(.+)$`),
    }
    // const opts: TProstoRewriteOptions = {
    //     blockSign,
    //     revealSign,
    //     interpolationDelimiters,
    //     instructionSign,
    //     htmlAttributeSign: options.htmlAttributeSign || 'rw:',
    //     htmlInstructionSign: options.htmlInstructionSign || 'rw-',
    // }
    return new ProstoParser<ENode>({
        rootNode: ENode.TEXTFILE,
        nodes: [
            textfileNode,

            blockIfNode(rg),
            blockElseIfNode(rg),
            blockElseNode(rg),

            ignoredLineNode(),
            revealNode(commentPrefix, revealSign),
            noInterpolateNode(commentPrefix, instructionSign),
            instructionNode(commentPrefix, instructionSign),
            blockNode(commentPrefix, blockSign),
            stringExpressionNode(interpolationDelimiters),
        ],
    })
}
