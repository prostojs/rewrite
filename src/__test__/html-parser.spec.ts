import fs from 'fs'
import path from 'path'
import { ProstoRewrite } from '..'

const hp = new ProstoRewrite().htmlRewriter

describe('html-parser', () => {
    
    it('must parse "plain"', () => {
        const name = 'plain'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
    it('must parse "attr"', () => {
        const name = 'attr'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
    it('must parse "v-if"', () => {
        const name = 'v-if'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
    it('must parse "v-if-else"', () => {
        const name = 'v-if-else'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
    it('must parse "v-for"', () => {
        const name = 'v-for'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
    it('must parse "complex"', () => {
        const name = 'complex'
        const result = hp.genRewriteCode(testFile(name))
        // saveCodeFile(name, result)
        expect(result).toEqual(codeFile(name))
    })
})

function testFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'html-parser', name + '.test')).toString()
}
function codeFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'html-parser', name + '.code')).toString()
}
function saveCodeFile(name: string, data: string) {
  return fs.writeFileSync(path.join(__dirname, 'html-parser', name + '.code'), data)
}