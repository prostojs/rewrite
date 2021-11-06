import { getHtmlParser } from "../rw-html-parser"

describe('html-parser', () => {
    it('must render code', () => {
        const p = getHtmlParser()
        const r = p.genRewriteFunction(`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>My test page</title>
            <!-- First Comment -->
        </head>
        <body>
            <!-- <div>commented div {{ value }}: {{ item.toUpperCase() }} </div> -->
            <img v-for="item of items" src="images/firefox-icon.png" :alt="'My test image ' + url + item">
            <div v-for="item of items">
                <a :href="item" />
                {{ item + 'string' }}
            </div>
            <span v-if="condition" :class=""> condition <strong>1</strong> end of {{ some.value }} </span>
            <span v-else-if="a === 5"> condition 2 </span>
            <span v-else> condition 3 </span>
            <div 
                dense="ab" de=""
                unquoted=value
                :data-id="d.id"
                :data-count="d.count"
                :data-weight="d.w"
                :class="white ? 'white' : 'bg-white'"
            >
            {{ 'so good 25 \\' }}' }}
            </div>
        </body>
        </html>`)
        console.log(r({ url: '/imgs/', d: {}, white: false, a: 4, condition: true, items: ['i1', 'i2'], value: 'val', item: 'some text', some: {value: 1} }))
        expect(r).toBeDefined()
    })
    it('must2', () => {
        const p = getHtmlParser()
        const r = p.genRewriteFunction(`        <!DOCTYPE html>
        before div
        <!-- comment -->
        <div :attr1="val1" attr2="=val2" v-if='t'>
        inside div {{a + 'expr'.toUpperCase() }}
        </div>
        <span v-else :class="abc"/>
        <meta>
        after div
        `)
        console.log(r({ abc: 'my-class', val1: 'v1', val2: 5, t: true, a: 'AAA' }))
        expect(r).toBeDefined()
    })
})