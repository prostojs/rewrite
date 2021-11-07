import { readFileSync } from 'fs'
import path from 'path'
import { ProstoRewrite } from '..'

const rw = new ProstoRewrite({ debug: false })

const scope = {
    classes: {
        red: 'color-red',
    },
    condition: true,
    items: ['item1', 'item2', 'item3'],
}
describe('rewriter', () => {

    beforeAll(async () => {
        await rw.rewriteDir({
            baseDir: inputPath(),
            output: outputPath(),
        }, scope)
    })

    it('must rewrite plain.html file', () => {
        const file = 'plain.html'
        expect(readFileSync(outputPath(file)).toString()).toEqual(readFileSync(toBePath(file)).toString())
    })
    it('must rewrite plain.js file', () => {
        const file = 'plain.js'
        expect(readFileSync(outputPath(file)).toString()).toEqual(readFileSync(toBePath(file)).toString())
    })
    it('must rewrite with-text.html file', () => {
        const file = 'with-text.html'
        expect(readFileSync(outputPath(file)).toString()).toEqual(readFileSync(toBePath(file)).toString())
    })
    it('must rewrite with-html.js file', () => {
        const file = 'with-html.js'
        expect(readFileSync(outputPath(file)).toString()).toEqual(readFileSync(toBePath(file)).toString())
    })
    it('must rewrite Dockerfile file', () => {
        const file = 'Dockerfile'
        expect(readFileSync(outputPath(file)).toString()).toEqual(readFileSync(toBePath(file)).toString())
    })
})

function inputPath(name?: string) {
    return name ? path.join(__dirname, 'rewriter', 'input', name) : path.join(__dirname, 'rewriter', 'input')
}

function toBePath(name: string) {
    return path.join(__dirname, 'rewriter', 'to-be', name)
}

function outputPath(name?: string) {
    return name ? path.join(__dirname, 'rewriter', 'output', name) : path.join(__dirname, 'rewriter', 'output')
}
