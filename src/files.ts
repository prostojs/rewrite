const errorMessage = 'Work with files supported only in NodeJS environment.'

let _fs: typeof import('fs') | undefined
let _path: typeof import('path') | undefined

async function getFs() {
    if (!_fs) _fs = await import('fs')
    return _fs
}

async function getPath() {
    if (!_path) _path = await import('path')
    return _path
}

export async function readDir(dirPath: string) {
    if (__NODE_JS__) {
        const path = await getPath()
        const fs = await getFs()
        async function* getFiles(dir: string): AsyncGenerator<string> {
            const dirents = await fs.promises.readdir(dir, {
                withFileTypes: true,
            })
            for (const dirent of dirents) {
                const res = path.resolve(dir, dirent.name)
                if (dirent.isDirectory()) {
                    yield* getFiles(res)
                } else {
                    yield res
                }
            }
        }
        return getFiles(dirPath)
    }
    throw new Error(errorMessage)
}

export async function readFile(filePath: string): Promise<string> {
    if (__NODE_JS__) {
        const fs = await getFs()
        try {
            const buf = await fs.promises.readFile(filePath)
            return buf.toString()
        } catch {
            throw new Error('File ' + filePath + ' does not exist.')
        }
    }
    throw new Error(errorMessage)
}

export async function writeFile(targetPath: string, data: string) {
    if (__NODE_JS__) {
        const path = await getPath()
        const fs = await getFs()
        const dirname = path.dirname(targetPath)
        await fs.promises.mkdir(dirname, { recursive: true })
        await fs.promises.writeFile(targetPath, data)
        return
    }
    throw new Error(errorMessage)
}

export async function copyFile(filePath: string, targetPath: string) {
    if (__NODE_JS__) {
        if (filePath === targetPath) return
        const path = await getPath()
        const fs = await getFs()
        const dirname = path.dirname(targetPath)
        await fs.promises.mkdir(dirname, { recursive: true })
        await fs.promises.copyFile(filePath, targetPath)
        return
    }
    throw new Error(errorMessage)
}

export async function pathResolve(p: string) {
    if (__NODE_JS__) {
        const path = await getPath()
        return path.resolve(p)
    }
    throw new Error(errorMessage)
}

export async function pathJoin(...parts: string[]) {
    if (__NODE_JS__) {
        const path = await getPath()
        return path.join(...parts)
    }
    throw new Error(errorMessage)
}

export async function pathDirname(p: string) {
    if (__NODE_JS__) {
        const path = await getPath()
        return path.dirname(p)
    }
    throw new Error(errorMessage)
}
