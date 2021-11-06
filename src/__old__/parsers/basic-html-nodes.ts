import { BasicNode, TBasicNodeOptions, TDefaultCustomDataType, TGenericCustomDataType } from '@prostojs/parser'

type StringType = { quote: string }

const stringOptions: TBasicNodeOptions<StringType> = {
    label: '',
    icon: '"',
    tokens: [/(?<quote>["'`])/, context => context.getCustomData().quote || '' ],
    backSlash: '-ignore',
}

export function getBasicNodes() {
    const docTypeNode = new BasicNode({
        label: 'Document Type',
        tokens: ['<!DOCTYPE ', '>'],
        tokenOE: 'omit-omit',
    })
    
    const cDataNode = new BasicNode({
        icon: '<![CDATA[',
        tokens: ['<![CDATA[', ']]>'],
        tokenOE: 'omit-omit',
    })
    
    const commentNode = new BasicNode({
        label: 'comment',
        icon: '“',
        tokens: ['<!--', '-->'],
        tokenOE: 'omit-omit',
    })
    
    const stringNode = new BasicNode<StringType>(stringOptions)

    return {
        docTypeNode,
        cDataNode,
        commentNode,
        stringNode,
    }
}

export function getStringNode() {
    return new BasicNode<StringType>(stringOptions)
}

export function getExprNode<T extends TGenericCustomDataType = TDefaultCustomDataType>(stringNode: BasicNode<StringType>, interpolationDelimiters: [string, string]) {
    return new BasicNode<T>({
        label: 'string',
        icon: '≈',
        tokens: [interpolationDelimiters[0], interpolationDelimiters[1] ],
        tokenOE: 'omit-omit',
    })
        .addAbsorbs(stringNode, 'join')
        .onPop(data => data.context.content = [data.context.content.join('')])
}
