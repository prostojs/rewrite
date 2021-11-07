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