import { ProstoRewrite } from '.'
import { readFileSync } from 'fs'

const scope = {
    some: { 
        var: 'somevar',
    },
    condition: false,
    a: 2,
}

const source1 = readFileSync('./src/test/source1').toString()
const source2 = readFileSync('./src/test/source2').toString()
const source3 = readFileSync('./src/test/source3').toString()

describe('rewrite', () => {
    it('must interpolate lines', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render('start {{= some.var + \'123\' =}} end', scope)).toEqual('start somevar123 end')
    })
    it('must rewrite for loop', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render(source1, scope)).toMatchSnapshot()
    })
    it('must rewrite if else (3rd condition)', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render(source2, scope)).toMatchSnapshot()
    })
    it('must rewrite if else (2nd condition)', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render(source2, { ...scope, a: 6 })).toMatchSnapshot()
    })
    it('must rewrite if else (1st condition)', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render(source2, { ...scope, condition: true })).toMatchSnapshot()
    })
    it('must execute rule no-interpolate-next-line', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render(source3, scope)).toMatchSnapshot()
    })
    it('must execute rule no-interpolate-file', () => {
        const rewrite = new ProstoRewrite()

        expect(rewrite.render('// @rw:no-interpolate-file\n' + source3, scope)).toMatchSnapshot()
    })
    it('must execute rule no-rewrite', () => {
        const rewrite = new ProstoRewrite()

        const src = '// @rw:no-rewrite\n\n' + 'start {{= some.var + \'123\' =}} end'
        expect(rewrite.render(src, scope)).toEqual(src)
    })
    it('must throw error on bad interpolation expression', () => {
        const rewrite = new ProstoRewrite()

        const src = '{{= this is ] bad =}}'
        expect(() => rewrite.render(src, scope)).toThrow()
    })
    it('must throw error on missing end of block', () => {
        const rewrite = new ProstoRewrite()

        const src = '//=IF(a === b)\n\nconst a = b\n\n'
        expect(() => rewrite.render(src, scope)).toThrow()
    })
    it('must throw error on unexpected end of block', () => {
        const rewrite = new ProstoRewrite()

        const src = '\n\nconst a = b\n\n//=ENDFOR\n'
        expect(() => rewrite.render(src, scope)).toThrow()
    })
    it('must throw error on unexpected reveal', () => {
        const rewrite = new ProstoRewrite()

        const src = '\n\n//: const r = \'2\'\n'
        expect(() => rewrite.render(src, scope)).toThrow()
    })
    it('must throw error on bad expression at reveal', () => {
        const rewrite = new ProstoRewrite()

        const src = '\n//=IF(condition)\nconst c = \'{{=1 ]=}}\'\n\n//=ENDIF'
        expect(() => rewrite.render(src, scope)).toThrow()
    })
    it('must render file', async () => {
        const rewrite = new ProstoRewrite()

        expect(await rewrite.renderFile('./src/test/source1')).toMatchSnapshot()
    })
})
