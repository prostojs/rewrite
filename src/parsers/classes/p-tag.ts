import { ProstoParseNode } from '@prostojs/parser'
import { htmlVoidTags } from '../constants'

interface TTagCustomData {
    tag: string
    endTag: string | null
}

const voidToken = new RegExp('^<(' + htmlVoidTags.join('|') + ')[\\s\\>]')

export class PTag extends ProstoParseNode<TTagCustomData> {
    constructor(isVoid?: boolean) {
        super({
            label: '',
            startsWith: {
                token: isVoid ? voidToken : /^<([^\s\>\/]+)/,
                // negativeLookAhead: /^\//,
                omit: true,
            },
            icon: '<>',
            onMatch({ matched, context, customData }) {
                customData.tag = matched[1]
                context.icon = matched[1]
            },
            endsWith: isVoid ? {
                token: /^\/?\>/,
                omit: true,
            } : {
                token: /^(?:\/\>|\<\/\s*(\w+)\s*\>)/,
                omit: true,
                onMatchToken: ({ matched, customData }) => {
                    customData.endTag = matched ? matched[1] : null
                    return true
                },
            },
            // skipToken: /^\s+/,
            badToken: /[^\s]/,
            onPop({ rootContext, customData }) {
                if (
                    !isVoid &&
                    customData.endTag === 'string' &&
                    customData.tag !== customData.endTag
                ) {
                    rootContext.panic(
                        `Open tag <${ customData.tag }> and closing tag </${ customData.endTag }> must be equal.`,
                        customData.endTag.length + 1,
                    )
                }
            },
        })
    }
}
