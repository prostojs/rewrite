import { getStringExpressionRewriter } from ".."

describe('strings', () => {
    const srw = getStringExpressionRewriter()

    it('must rewrite string', () => {
        const r = srw.rewrite('before {{ a }} after', { a: 'expression'})
        expect(r).toEqual('before expression after')
    })

    it('must rewrite expression preserving its type', () => {
        const r = srw.rewrite('{{ a }}', { a: 5 })
        expect(r).toEqual(5)
        const r2 = srw.rewrite('{{ a.toFixed() }}', { a: 5 })
        expect(r2).toEqual('5')
    })

    it('must rewrite complex case', () => {
        const config = {
            path: 'some/path/{{ key.toLowerCase() }}.{{ type === \'javascript\' ? \'js\' : \'json\' }}'
        }
        
        const context = {
            key: 'TEST',
            type: 'javascript',
        }
        const pathFunc = srw.genRewriteFunction(config.path)
        const thePath = pathFunc(context)
        expect(thePath).toEqual('some/path/test.js')
    })
})
