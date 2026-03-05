# @prostojs/rewrite

A lightweight template engine for **code generation and scaffolding**. Embed conditional blocks, loops, and expressions directly in real source files — templates stay syntactically valid and readable. Supports both source code (text mode with comment-based directives) and HTML/XML (Vue-like `v-if`, `v-for`, `:attr` bindings).

- Templates compile to cached JS functions — repeated renders are near-instant
- Under 27 KB bundled, zero runtime dependencies beyond `@prostojs/parser`
- Auto-detects text vs HTML mode by file extension; switch modes mid-file with directives
- Point at a directory to scaffold entire projects with a single call

## Install

```bash
npm install @prostojs/rewrite
# or
pnpm add @prostojs/rewrite
```

## Quick Start

```js
import { ProstoRewrite } from '@prostojs/rewrite'

const rw = new ProstoRewrite()

// Text mode — rewrite a source code template
const result = rw.textRewriter.rewrite(
  `Hello {{ name }}! You have {{ count }} items.`,
  { name: 'World', count: 3 }
)
// => "Hello World! You have 3 items."

// HTML mode — rewrite markup
const html = rw.htmlRewriter.rewrite(
  `<ul><li v-for="item of items">{{ item }}</li></ul>`,
  { items: ['apple', 'banana', 'cherry'] }
)
// => "<ul><li>apple</li>\n<li>banana</li>\n<li>cherry</li></ul>"
```

## Text Mode

Text mode is designed for source code, config files, Dockerfiles, and any non-HTML content. Directives are embedded in line comments, keeping your templates syntactically valid.

### Expressions

Use `{{ }}` delimiters (customizable) to interpolate any JavaScript expression:

```
const greeting = '{{ salutation }} {{ name }}!'
const sum = {{ a + b }}
```

Context: `{ salutation: 'Hello', name: 'World', a: 2, b: 3 }`

Output:
```
const greeting = 'Hello World!'
const sum = 5
```

### Conditional Blocks (IF / ELSE / ELSEIF)

```js
//=IF (env === 'production')
const API = 'https://api.prod.com'
//=ELSEIF (env === 'staging')
const API = 'https://api.staging.com'
//=ELSE
const API = 'http://localhost:3000'
//=ENDIF
```

Context: `{ env: 'staging' }` produces:
```js
const API = 'https://api.staging.com'
```

The comment prefix (`//`, `#`, `--`, etc.) is automatically detected from the line. Use whatever comment style fits your language:

```yaml
#=IF (includeRedis)
redis:
  image: redis:alpine
#=ENDIF
```

**Operation blocks reference:**

| Key | Example | Description |
|---|---|---|
| `IF` | `//=IF(condition)` | Includes lines below only if `condition` is truthy. |
| `ELSEIF` | `//=ELSEIF(condition)` | Alternative branch. Must follow `IF` or `ELSEIF`. |
| `ELSE` | `//=ELSE` | Fallback branch. Must follow `IF` or `ELSEIF`. |
| `ENDIF` | `//=ENDIF` | Closes the `IF` block chain. |
| `FOR` | `//=FOR(a of b)` | Iterates with any valid JS loop expression. |
| `ENDFOR` | `//=ENDFOR` | Closes the `FOR` block. |

> Operation blocks can have spaces between words: `ELSE IF`, `END FOR`, etc.
> All blocks work with `#` and `//` comment prefixes.

### Loops (FOR / ENDFOR)

```js
//=FOR (const route of routes)
app.get('{{ route.path }}', {{ route.handler }})
//=ENDFOR
```

Context: `{ routes: [{ path: '/api', handler: 'apiHandler' }, { path: '/', handler: 'indexHandler' }] }`

Output:
```js
app.get('/api', apiHandler)
app.get('/', indexHandler)
```

### Nesting

Blocks nest freely:

```js
//=IF (features.auth)
//=FOR (const provider of authProviders)
//=IF (provider !== 'local')
import {{ provider }}Strategy from './strategies/{{ provider }}'
//=ENDIF
//=ENDFOR
//=ENDIF
```

### Reveal Lines

Lines prefixed with `//:` (comment + reveal marker) are **hidden in the template but appear in the output**. This is the inverse of normal lines — useful for generating code that shouldn't be visible in the template source:

```js
//=IF (useTypescript)
//: import type { Config } from './types'
//=ENDIF
const config = {}
```

Context: `{ useTypescript: true }`

Output:
```js
import type { Config } from './types'
const config = {}
```

Reveal lines can contain expressions too:

```js
//: const {{ varName }} = {{ JSON.stringify(defaultValue) }}
```

### Directives

| Directive | Example | Description |
|---|---|---|
| `ignore-next-line` | `//!@ignore-next-line` | The next line passes through as-is, without interpolation. |
| `html-mode-on` | `//!@html-mode-on` | Switch to HTML mode (mixed rewriter only). |
| `html-mode-off` | `//!@html-mode-off` | Switch back to text mode. |

```js
//!@ ignore-next-line
const template = '{{ this is not interpolated }}'
const value = '{{ this IS interpolated }}'
```

### Full Text Mode Example

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

Context: `{ a: 1, b: 1, c: 2, d: 2, items: [1, 2] }`

Output:
```js
let myVar = 1
const item1 = '1' // reveal comment
myVar += 2
const item2 = '2' // reveal comment
myVar += 2
const myVar2 = 2
```

## HTML Mode

HTML mode parses markup structure and supports Vue-inspired directives for conditionals, loops, and dynamic attributes.

### Expressions

Interpolation works the same as text mode:

```html
<h1>{{ title }}</h1>
<p>Welcome, {{ user.name }}!</p>
```

### Conditional Rendering (v-if / v-else-if / v-else)

```html
<div v-if="user.isAdmin">
    <h2>Admin Panel</h2>
</div>
<div v-else-if="user.isEditor">
    <h2>Editor Dashboard</h2>
</div>
<div v-else>
    <h2>Welcome, {{ user.name }}</h2>
</div>
```

Only the matching block is rendered. The `v-if` / `v-else-if` / `v-else` chain must be on sibling elements.

### Loops (v-for)

```html
<ul>
    <li v-for="item of items">{{ item }}</li>
</ul>
```

Any valid JavaScript loop expression works:

```html
<tr v-for="let i = 0; i < rows.length; i++">
    <td>{{ rows[i].name }}</td>
</tr>
```

`v-for` and `v-if` can be combined on the same element:

```html
<li v-for="item of items" v-if="item.visible">{{ item.name }}</li>
```

### Dynamic Attributes

Prefix any attribute with `:` to evaluate it as a JavaScript expression:

```html
<img :src="baseUrl + '/images/' + image.file" :alt="image.title">
<a :href="link.url" :target="link.external ? '_blank' : undefined">{{ link.text }}</a>
```

**Smart boolean handling:** if the expression evaluates to `true`, the attribute is rendered without a value (`<input disabled>`). If `false`, the attribute is omitted entirely:

```html
<input type="text" :disabled="isLocked" :required="isRequired">
```

Context: `{ isLocked: true, isRequired: false }`

Output:
```html
<input type="text" disabled>
```

### Switch to Text Mode

Inside an HTML file, switch to text-mode parsing with HTML comment directives:

```html
<script>
    <!--!@ text-mode-on -->
    //=FOR (const key of Object.keys(config))
    window.{{ key }} = {{ JSON.stringify(config[key]) }}
    //=ENDFOR
    <!--!@ text-mode-off -->
</script>
```

And the reverse — switch to HTML inside a text file:

```js
const html = `
//!@ html-mode-on
<div v-for='item of items'>
    <span>{{ item }}</span>
</div>
//!@ html-mode-off
`
```

## File and Directory Rewriting

The main use case: scaffold entire project templates.

### Rewrite a Single File

```js
import { ProstoRewrite } from '@prostojs/rewrite'

const rw = new ProstoRewrite()

// Returns rendered content; optionally writes to output path
const content = await rw.rewriteFile(
  {
    input: 'path/to/template.js',
    output: 'path/to/output.js',  // optional
    mode: 'auto',                 // optional: 'text' | 'html' | 'auto'
  },
  { name: 'my-app', version: '1.0.0' }
)
```

### Rewrite an Entire Directory

```js
await rw.rewriteDir(
  {
    baseDir: './template',
    output: './my-new-project',
    include: ['**/*'],                                        // optional glob patterns
    exclude: ['node_modules/**'],                             // optional glob patterns
    renameFile: (name) => name.replace('__name__', 'my-app'), // optional
    onFile: (path, output) => console.log(`Wrote: ${path}`),  // optional callback
    mode: 'auto',                                             // optional
  },
  {
    name: 'my-app',
    description: 'My awesome app',
    useTypescript: true,
    features: ['auth', 'api', 'database'],
  }
)
```

**Mode auto-detection** picks the right parser based on file extension:
- **HTML mode:** `*.html`, `*.xhtml`, `*.xml`, `*.svg`
- **Text mode:** `*.js`, `*.ts`, `*.jsx`, `*.tsx`, `*.json`, `*.yml`, `*.yaml`, `*.md`, `*.txt`, `*.ini`, `Dockerfile`, `*config`, `.gitignore`

Files that don't match any pattern are copied as-is.

## Rewriters

`ProstoRewrite` provides three rewriter flavors:

```js
const rw = new ProstoRewrite()

const trw = rw.textRewriter    // text only
const hrw = rw.htmlRewriter    // html only
const mrw = rw.mixedRewriter   // both (supports mode-switching directives)
// mrw.text — text rewriter with html-mode-on support
// mrw.html — html rewriter with text-mode-on support
```

Each rewriter has the same interface:

```js
// Generate the compiled JavaScript source (for inspection/debugging)
trw.genRewriteCode(source)

// Compile once, execute many times — ideal for repeated renders
const render = trw.genRewriteFunction(source)
const out1 = render({ name: 'Alice' })
const out2 = render({ name: 'Bob' })

// One-shot: parse + compile + execute
trw.rewrite(source, context)

// Debug: print the parse tree to console
trw.printAsTree(source)
```

### String Expression Rewriter

For simple interpolation without block operations (config values, file paths):

```js
import { getStringExpressionRewriter } from '@prostojs/rewrite'

const srw = getStringExpressionRewriter()

// Mixed string: always returns string
srw.rewrite('Hello {{ name }}, age {{ age }}', { name: 'World', age: 25 })
// => "Hello World, age 25"

// Single expression: preserves the original type
srw.rewrite('{{ count }}', { count: 42 })
// => 42 (number, not string)
```

This is useful for configuration files where property values can contain expressions:

```js
const config = {
  path: "some/path/{{ key.toLowerCase() }}.{{ type === 'javascript' ? 'js' : 'json' }}",
}

const pathFunc = srw.genRewriteFunction(config.path)
pathFunc({ key: 'TEST', type: 'javascript' })
// => "some/path/test.js"
```

## Options

All options are optional. The example below shows the default values:

```js
const rw = new ProstoRewrite({
  defaultMode: 'auto',   // 'text' | 'html' | 'auto'
  debug: false,

  htmlPattern: ['*.{html,xhtml,xml,svg}'],
  textPattern: [
    '*.{js,jsx,ts,tsx,txt,json,yml,yaml,md,ini}',
    'Dockerfile',
    '*config',
    '.gitignore',
  ],

  text: {
    exprDelimiters: ['{{', '}}'],
    blockOperation: '=',
    revealLine: ':',
    directive: '!@',
  },

  html: {
    exprDelimiters: ['{{', '}}'],
    blockOperation: 'v-',
    attrExpression: ':',
    directive: '!@',
    voidTags: ['area', 'base', 'br', 'col', 'command', 'embed', 'hr',
               'img', 'input', 'keygen', 'link', 'meta', 'param',
               'source', 'track', 'wbr'],
    textTags: ['script', 'style'],
  },
})
```

| Option | Type | Description |
|---|---|---|
| `defaultMode` | `'text'` \| `'html'` \| `'auto'` | Template processor selection. `auto` uses file patterns to decide. |
| `debug` | `boolean` | Print debug parse trees to console. |
| `htmlPattern` | `string[]` | Glob patterns for files processed by HTML parser. |
| `textPattern` | `string[]` | Glob patterns for files processed by text parser. |
| `text.exprDelimiters` | `[string, string]` | Expression delimiters. Default: `['{{', '}}']` |
| `text.blockOperation` | `string` | Prefix for block operations (`IF`, `FOR`, ...). Default: `'='` |
| `text.revealLine` | `string` | Prefix for reveal lines. Default: `':'` |
| `text.directive` | `string` | Prefix for directives (`ignore-next-line`, ...). Default: `'!@'` |
| `html.exprDelimiters` | `[string, string]` | Expression delimiters. Default: `['{{', '}}']` |
| `html.blockOperation` | `string` | Prefix for block attributes (`if`, `for`, ...). Default: `'v-'` |
| `html.attrExpression` | `string` | Prefix for expression attributes. Default: `':'` |
| `html.directive` | `string` | Prefix for directives (`text-mode-on`, ...). Default: `'!@'` |
| `html.voidTags` | `string[]` | Self-closing HTML tags. |
| `html.textTags` | `string[]` | Tags with text-only content (no child tag parsing). |

## License

MIT
