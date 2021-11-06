import { getHtmlParser } from './html-template'
import { getTextParser2 } from './text-template'

describe('html', () => {
    it('must', () => {
        const parser = getHtmlParser({
            blockSign: '',
            htmlAttributeSign: 'rw:',
            htmlInstructionSign: 'rw-',
            instructionSign: '',
            interpolationDelimiters: ['{{=', '=}}'],
            revealSign: '',
        })
        console.log(
            parser.parse(`<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>My test page</title>
        <!-- First Comment -->
    </head>
    <body>
        <!-- <div>commented div {{= value =}}: {{= item.toUpperCase() =}} </div> -->
        <img src="images/firefox-icon.png" rw:alt="'My test image ' + url">
        <div rw-for="item of items">
            <a rw:href="item" />
            {{= item + 'string' =}}
        </div>
        <span rw-if="condition" rw:class=""> condition <strong>1</strong> end of {{= some.value =}} </span>
        <span rw-else-if="a === 5"> condition 2 </span>
        <span rw-else> condition 3 </span>
        <div 
            dense="ab" de=""
            rw:data-id="d.id"
            rw:data-count="d.count"
            rw:data-weight="d.w"
            rw:class="white ? 'white' : 'bg-white'"
        >
        {{= 'so good 25 \\' =}}' =}}
        </div>
    </body>
    </html>`).toTree()
        )
        expect(parser).toBeDefined()
    })

    it('must text', () => {
        const result = getTextParser2()(`
        const v = 1
        234
        const b = '{{= a + ' =}}\\' abc' =}}'
        //=IF(condition === 'undefined')
            inside if
            //= FOR (let i = 0; i < 5; i++)
            const b = {{= i + ' =}}' =}}
            inside for
                //=IF (123)
                inside nested if
                //=ELSE IF (234234)
                inside nested else if
                //=ELSE IF (234234)
                inside nested else if2
                {{ multiline
                expression 'test'}}
                //=ELSE
                inside nested else
                //=ENDIF
            after nested endif
            //= ENDFOR
        //=ELSE
        NOTHING after else   
        //=ENDIF
        after endif
        `)
        console.log(result)
        expect(result).toBeDefined()
    })
})
