import { getTextParser } from './text-template'

describe('text', () => {
    it('must', () => {
        const parser = getTextParser({
            blockSign: '',
            htmlAttributeSign: 'rw:',
            htmlInstructionSign: 'rw-',
            instructionSign: '',
            interpolationDelimiters: ['{{=', '=}}'],
            revealSign: '',
        })
        console.log(
            parser.parse(`
const fs = require('fs')
const path = require('path')

//= FOR(let i = 0; i < 5; i++)
//: const a{{=i=}} = '{{=i=}}'

//= END FOR
//= IF (condition)
const r = '22'
const t = '{{= 23 =}}'
const y = '24'

//= IF (condition)
const a = 'a'

//= ELSE IF (a > 5)
const b = 'b'
//= ELSE
const c = 'c'
//= END IF

//= END IF

// @rw:no-interpolate-next-line
const a = '{{= some.var =}}'
const b = '{{= some.var =}}'
            `).toTree()
        )
        expect(parser).toBeDefined()
    })
})
