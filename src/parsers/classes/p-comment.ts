import { ProstoParseNode } from '@prostojs/parser'

interface TCommentCustomData {
}

export class PComment extends ProstoParseNode<TCommentCustomData> {
    constructor(tokens = ['<!--', '-->']) {
        super({
            label: __DYE_WHITE__ + __DYE_DIM__ + 'comment',
            icon: __DYE_WHITE__ + __DYE_DIM__ + '“',
            startsWith: {
                token: tokens[0],
                omit: true,
            },
            endsWith: {
                token: tokens[1],
                omit: true,
            },
        })
    }
}
