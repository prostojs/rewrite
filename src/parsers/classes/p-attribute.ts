import { ProstoParseNode } from '@prostojs/parser'
import { escapeRegex } from '../../utils'

interface TAttributeCustomData {
    key: string
    value: string
}

export class PAttribute extends ProstoParseNode<TAttributeCustomData> {
    constructor(valueNode: ProstoParseNode, nullable = true, attrPrefix?: string, icon = '=') {
        super({
            label: 'attribute',
            icon,
            startsWith: {
                token: attrPrefix 
                    ? new RegExp('^' + escapeRegex(attrPrefix) + '([^=\\s"\'`\\>]+)')
                    : /^([a-zA-Z0-9\.\-\_\@\#\$\&\*]+)/,
                // : /^[a-zA-Z0-9\.\-\_\@]/,
            },
            endsWith: {
                token: /^[\s\n\/>]/,
                eject: true,
            },
            onMatch({ context, customData, matched }) {
                customData.key = matched[1]
                context.label = matched[1]
            },
            badToken: /^["'`\s]/i,
            hoistChildren: [
                {
                    node: valueNode,
                    as: 'value',
                    removeFromContent: true,
                    deep: 1,
                    map: ({ content }) => content.join(''),
                },
            ],
            onPop({ customData, rootContext }) {
                if (!nullable && typeof customData.value === 'undefined') {
                    rootContext.panic(`Interpolation attribute "${ customData.key }" must have value.`)
                }
            },
            popsAfterNode: [valueNode.id],
            recognizes: [valueNode.id],
        })
    }
}
