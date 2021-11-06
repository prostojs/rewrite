import { BasicNode } from '@prostojs/parser'

export function getAttrNodes() {
    const valueNode = new BasicNode<{ quote: string }>({
        label: 'value',
        icon: '=',
        tokens: [/=(?<quote>["'`])/, context => context.getCustomData().quote || '' ],
        backSlash: '-ignore',
        tokenOE: 'omit-omit',
    })

    const unquotedValueNode = new BasicNode<{ quote: string }>({
        label: 'value',
        icon: '=',
        tokens: [/=(?<content>\w+)/, /[\s\/\>]/ ],
        tokenOE: 'omit-eject',
    })

    const attrNode = new BasicNode<{ key: string, value: string }>({
        label: 'attribute',
        icon: '=',
        tokens: [/(?<key>[\w:\-\.]+)/, /[\s\n\/>]/],
        tokenOE: 'omit-eject',
    })
        .addPopsAfterNode(unquotedValueNode, valueNode)
        .addAbsorbs([unquotedValueNode, valueNode], 'join->value')

    return {
        valueNode,
        unquotedValueNode,
        attrNode,
    }
}
