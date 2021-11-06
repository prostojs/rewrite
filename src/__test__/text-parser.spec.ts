import { getTextParser } from '../rw-text-parser'
import fs from 'fs'
import path from 'path'

const tp = getTextParser()

describe('text-parser', () => {
  it('must parse "if"', () => {
      const name = 'if'
      const result = tp.getCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "for"', () => {
      const name = 'for'
      const result = tp.getCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "ifelseif"', () => {
      const name = 'ifelseif'
      const result = tp.getCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "if-for-nested"', () => {
      const name = 'if-for-nested'
      const result = tp.getCode(testFile(name))
      // saveCodeFile(name, result)
      expect(result).toEqual(codeFile(name))
  })
  it('must parse "string"', () => {
      const name = 'string'
      const result = tp.getCode(testFile(name))
      // saveCodeFile(name, result)
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
