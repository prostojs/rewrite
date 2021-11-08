# @prostojs/rewrite

Easy and light templates renderer with HTML (XML) support based on [@prostojs/parser](https://www.npmjs.com/package/@prostojs/parser).

- Write syntactically valid templates (js, yaml, ...)
- Use vue-like syntax for html-templates
- Mix __html__ and __text__ modes at single template

## Install

npm: 

`npm install @prostojs/rewrite`

Via CDN:
```
<script src="https://unpkg.com/@prostojs/tree"></script>
<script src="https://unpkg.com/@prostojs/parser"></script>
<script src="https://unpkg.com/@prostojs/rewrite"></script>
```

## Usage

It's possible to point the `ProstoRewrite` to a file or a directory. It's also possible to rewrite any string using [rewriters](#rewriters) directly.

```js
const { ProstoRewrite } = require('@prostojs/rewrite')
// or import module
// import { ProstoRewrite } from '@prostojs/rewrite'

const rw = new ProstoRewrite()
main()
async function main() {
    const context = { a: 1 } // context object for templates interpolation

    // rewrite a single file
    const renderedContent = await rw.rewriteFile({
        // required:
        input: 'path/to/file/filename.js',
        // optional:
        output: 'path/to/rewrite/filename.js',
        mode: 'auto',   // text | html | auto
    }, context)

    // rewrite files in directory
    await rw.rewriteDir({
        // required:
        baseDir: 'path/to/files',
        // optional:
        include: ['*.{js,html}'],   // glob pattern to include
        exclude: ['*.svg'],         // glob pattern to exclude
        output: 'output/path',
        mode: 'auto',               // text | html | auto
        onFile: (path, output) => {
            console.log('Result for file ' + path + '\n' + output)
        }
    }, context)
}
```

## Templates

### TEXT

The text template is good for any text source (js, ts, yaml, ...).

To keep the source files syntactically valid all the control flow blocks 
must be written in comment `//` or `#`.

Text template consists of:
- operation blocks (`//=IF(...)`),
- directives (`//!@ignore-next-line`),
- reveal comments (`//: const a = 1`),
- string expressions (`conat a = {{ scopedValue }}`).

**Operation blocks*** **:**
Key | Example | Description
---|---|---
`IF`|`//=IF(condition)` or `#=IF(condition)`|WIll add the lines below only if the `condition` returns `true`. The `condition` must be a valid javascript and can use `context` vars.
`ELSEIF`**|`//=ELSEIF(condition)` or `#=ELSEIF(condition)`|WIll add the lines below only if the `condition` returns `true`. The `condition` must be a valid javascript and can use `context` vars. Must be used after `IF` or `ELSEIF` operation block.
`ELSE`|`//=ELSE` or `#=ELSE`|WIll add the lines below only if the previous conditions didn't match. Must be used after `IF` or `ELSEIF` operation block.
`ENDIF`**|`//=ENDIF` or `#=ENDIF`|Ends the `IF` blocks series.
`FOR`|`//=FOR(a of b)` or `#=FOR(a of b)`|Will iterate through the loop. The `a of b` part must be a valid javascript loop expression and can use `context` vars.
`ENDFOR`**|`//=ENDFOR` or `#=ENDFOR`|Ends the `FOR` block.

*The operation block can have spaces before it and after it, but it must take only one line. All the operation blocks can start with `#` as well as with `//`

**The operation block may have spaces between words e.g. `ELSE IF`, `END FOR`...

**Directives:**

Key|Example|Description
---|---|---
`ignore-next-line` |`//!@ignore-next-line` or `#!@ignore-next-line`|Instruct the processor to ignore (not interpolate) the next line of the source. The next line will be copied without any change.
`html-mode-on`|`//!@html-mode-on` or `#!@html-mode-on`|Instructs the processor (only if it is mixed rewriter) to start using HTML mode for the futher lines of the source.
`html-mode-off`|`//!@html-mode-off` or `#!@html-mode-off`|Instructs the processor (only if it is mixed rewriter) to stop using HTML mode for the futher lines of the source and return to the text mode.

**Reveal comments:** the line prefixed with `reveal comment` prefix will be rendered as **uncommented** line. Use this when needed to keep the source file syntatically valid.

**String expressions:** vue-like string expressions `{{ scopedValue }}` accepts valid javascript code and must interpolate into a `string` or anything that can be casted to `string`. The expression can access the context vars.

**Example:**

Source:
```js
let myVar = 1
//=IF (a === b)
    //=FOR (const i of items)
//: const item{{ i }} = '{{ i }}' // reveal comment
        //=IF (c === d)
myVar += 2
        //=ELSE
myVar -= 4
        //=ENDIF
    //=END FOR
//=END IF
const myVar2 = 2
```

Will be rewritten with context = `{ a: 1, b: 1, c: 2, d: 2, items: [1, 2] }`:
```js
let myVar = 1
const item1 = '1' // reveal comment
myVar += 2
const item2 = '2' // reveal comment
myVar += 2
const myVar2 = 2
```

### HTML

The html template is good for XML-like sources (html, xml, svg, ...).

By default html template uses vue-like syntax.

**It supports:**
- `v-for="..."`: attribute for loop the node. Expression must be a valid javascript loop expression.
- `v-if="..."`: attribute for conditional rendering of the node. Expression must be a valid javascript condition expression.
- `v-else-if="..."`: attribute for conditional rendering of the node. Expression must be a valid javascript condition expression.
- `v-else`: attribute for conditional rendering of the node.
- `:<attr_name>="..."`: expression as attribute value. Expression must be a valid javascript code that returns string/boolean or anything that casts to a string/boolean. If the expression result is type of boolean, the attribute will have no value and will be hidden if the result equals `false`.
- `{{ ... }}`: vue-like string expressions `{{ scopedValue }}` accepts valid javascript code and must interpolate into a `string` or anything that can be casted to `string`. The expression can access the context vars.

### TEXT & HTML

By default `ProstoRewrite` supports both: text and html modes at the same time. The default mode is controled by the [options](#options).

If you want to switch to html mode in the middle of the text source you can use the following instruction:

`//!@html-mode-on` or `#!@html-mode-on`

And to switch back use:

`//!@html-mode-off` or `#!@html-mode-off`

If you want to switch to text mode in the middle of the html source you can use the following instruction:

`<!--!@text-mode-on-->`

And to switch back use:

`<!--!@text-mode-off-->`

**Examples:**

Text template with embedded html processor:
```js
const a = 'test'
//=IF (condition)
const html = `
//!@ html-mode-on
<div v-for='item of items'>
    <span>{{ item }}</span>
</div>
//!@ html-mode-off
`
//=END IF
```

Html template with embedded text processor:
```html
<div v-if="condition">
    <!--!@ text-mode-on -->
    const a = 'b'
    #=IF (condition)
    console.log(a)
    #=ENDIF
    <!--!@ text-mode-off -->
</div>
```

### Options

Options object is totally optional. The example below demonstrates the default values.

```js
const rw = new ProstoRewrite({
    defaultMode: 'auto',    // text | html | auto
    debug: false,
    htmlPattern: ['*.{html,xhtml,xml,svg}'],
    textPattern: [
                    '*.{js,jsx,ts,tsx,txt,json,yml,yaml,md,ini}',
                    'Dockerfile',
                    '*config',
                    '.gitignore',
                ],
    html: {
        exprDelimeters: ['{{', '}}'],
        attrExpression: ':',
        blockOperation: 'v-',
        directive: '!@',
        voidTags: [
                    'area',
                    'base',
                    'br',
                    'col',
                    'command',
                    'embed',
                    'hr',
                    'img',
                    'input',
                    'keygen',
                    'link',
                    'meta',
                    'param',
                    'source',
                    'track',
                    'wbr',
                ],
        textTags: ['script', 'style'],
    },
    text: {
        exprDelimeters: ['{{', '}}'],
        blockOperation: '=',
        revealLine: ':',
        directive: '!@',
    },
})
```

Option | Type | Description
---|---|---
defaultMode | `'text'` \| `'html'` \| `'auto'` | Determines the type of template processor used for templates. When `auto` it will use `htmlPattern` and `textPattern` options to decide on which processor to use.
debug       | `boolean`   | Pushes debug messages to console when `true`.
htmlPattern | `string[]`  | Glob pattern that defines files to be processed by `html` processor for `defaultMode` = `'auto'` mode.
textPattern | `string[]`  | Glob pattern that defines files to be processed by `text` processor for `defaultMode` = `'auto'` mode.
text        | `object`    | Options for `text` processor.
text.exprDelimeters | `[string, string]` | Defines the delimeters for string expressions e.g. `{{ n.toLowerCase() }}`. Default: `['{{', '}}']`.
text.blockOperation | `string` | Defines the prefix for block operations (e.g. `for`, `if`, ...). Default: `'='`.
text.revealLine     | `string` | Defines the prefix for reveal commented line. Default: `':'`.
text.directive      | `string` | Defines the prefix for directives (e.g. `ignore-next-line`, `html-mode-on`, ...). Default: `'!@'`.
html        | `object`    | Options for `html` processor.
html.exprDelimeters | `[string, string]` | Defines the delimeters for string expressions e.g. `{{ n.toLowerCase() }}`. Default: `['{{', '}}']`.
html.attrExpression | `string` | Defines the prefix for attributes that have to be interpolated. Default: `':'`.
html.blockOperation | `string` | Defines the prefix for block-operations attributes (e.g. `for`, `if`, ...). Default: `'v-'`.
html.directive      | `string` | Defines the prefix for directives (e.g. `text-mode-on`, ...). Default: `'!@'`.
html.voidTags       | `string[]` | List of void tags (without closing tags and without innerText)
html.textTags       | `string[]` | List of text tags (that contain text and no other tags)

## Rewriters

Instance of `ProstoRewrite` ships 3 versions of rewriters:
- text
- html
- mixed

```js
const rw = new ProstoRewrite()
// 3 flavors:
const trw = rw.textRewriter     // rewriter that can parse only text
const hrw = rw.htmlRewriter     // rewriter that can parse only html
const mrw = rw.mixedRewriter    // rewriter that can parse both
// source for text rewriter:
const source = '//=IF (a === 1)\nconst a = 1'
const context = { a: 1 }
// each rewriter has the same interface:
trw.genRewriteCode(source)      // returns rendered function source code
trw.genRewriteFunction(source)  // returns rewrite-function
trw.printAsTree(source)         // prints parsed source as a tree
trw.rewrite(source, context)      // renders the source with context
```

If you're going to use one template file for multiple renders it makes sense to cache its rewrite-function:

```js
// An abstract example of using cached rewrite-function
const rw = new ProstoRewrite()
const trw = rw.textRewriter
const rewriteFunc = trw.genRewriteFunction(source)
const result1 = rewriteFunc(context1)
const result2 = rewriteFunc(context2)
const result3 = rewriteFunc(context3)
```
