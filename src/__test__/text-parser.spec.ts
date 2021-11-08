import fs from 'fs'
import path from 'path'
import { ProstoRewrite } from '..'

const tp = new ProstoRewrite().textRewriter

describe('text-parser', () => {
  it('must parse "if"', () => {
      const name = 'if'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "for"', () => {
      const name = 'for'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "ifelseif"', () => {
      const name = 'ifelseif'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "if-for-nested"', () => {
      const name = 'if-for-nested'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "string"', () => {
      const name = 'string'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "reveal"', () => {
      const name = 'reveal'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "reveal-complex"', () => {
      const name = 'reveal-complex'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "directive"', () => {
      const name = 'directive'
      const result = tp.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must rewrite "js"', () => {
      const name = 'js'
      const result = tp.rewrite(testFile(name), { a: 1, b: 1, c: 2, d: 2, items: [1,2]})
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must rewrite "tricky-string"', () => {
      const name = 'tricky-string'
      const result = tp.rewrite(testFile(name), { a: 1, b: 1, c: 2, d: 2, items: [1,2]})
    //   saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must rewrite "json"', () => {
      const name = 'json'
      const result = tp.rewrite(testFile(name), { a: 1, b: 1, c: 2, d: 2, items: [1,2]})
    //   saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
})

function testFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'text-parser', name + '.test')).toString()
}
function codeFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'text-parser', name + '.code')).toString()
}
function saveCodeFile(name: string, data: string) {
  return fs.writeFileSync(path.join(__dirname, 'text-parser', name + '.code'), data)
}
