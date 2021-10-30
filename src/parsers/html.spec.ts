import { getHtmlParser } from './html-template'

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
            {{= item =}}
        </div>
        <span rw-if="condition" rw:class=""> condition 1 </span>
        <span rw-else-if="a === 5"> condition 2 </span>
        <span rw-else> condition 3 </span>
        <div 
            rw:data-id="d.id"
            rw:data-count="d.count"
            rw:data-weight="d.w"
            rw:class="white ? 'white' : 'bg-white'"
        >
        </div>
    </body>
    </html>`).toTree()
        )
        expect(parser).toBeDefined()
    })
})
