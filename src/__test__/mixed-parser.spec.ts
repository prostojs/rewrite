import fs from 'fs'
import path from 'path'
import { ProstoRewrite } from '..'

const mp = new ProstoRewrite().mixedRewriter

describe('mixed-parser', () => {
  it('must switch from text to html', () => {
      const name = 'text-html'
      const result = mp.text.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must switch from html to text', () => {
      const name = 'html-text'
      const result = mp.html.genRewriteCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
})

function testFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'mixed-parser', name + '.test')).toString()
}
function codeFile(name: string) {
  return fs.readFileSync(path.join(__dirname, 'mixed-parser', name + '.code')).toString()
}
function saveCodeFile(name: string, data: string) {
  return fs.writeFileSync(path.join(__dirname, 'mixed-parser', name + '.code'), data)
}
