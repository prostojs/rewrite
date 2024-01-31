import { ProstoRewrite } from ".."
import { readFileSync, existsSync, unlinkSync } from 'fs'
import Path from 'path'

describe('templates', () => {
    beforeAll(async () => {
        safeUnlink(p('./templates-out/test.html'))
        safeUnlink(p('./templates-out/test.js'))
        safeUnlink(p('./templates-out/rename.json'))
        const rw = new ProstoRewrite()
        await rw.rewriteDir({
            baseDir: p('./templates'),
            output: p('./templates-out'),
            renameFile: name => {
                console.log(name)
                return name.startsWith('__') ? name.slice(2) : name
            },
        }, {
            array: ['item1', 'item2'],
            script: 'http://test',
            path: false,
        })
    })
    it('must rewrite dir', () => {
        expect(existsSync(p('./templates-out/test.html'))).toBeTruthy()
        expect(existsSync(p('./templates-out/test.js'))).toBeTruthy();
        expect(existsSync(p('./templates-out/rename.json'))).toBeTruthy();
        expect(readFileSync(p('./templates-out/test.html')).toString()).toMatchSnapshot()
        expect(
            readFileSync(p('./templates-out/test.js')).toString(),
        ).toMatchSnapshot();
        expect(
            readFileSync(p('./templates-out/rename.json')).toString(),
        ).toMatchSnapshot();
    })
})

function p(path: string) {
    return Path.join(process.cwd(), 'src', '__test__', path)
}

function safeUnlink(file: string) {
    try {
        unlinkSync(file)
    } catch {}
}
