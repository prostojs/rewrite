const errorMessage = 'Work with files supported only in NodeJS environment.'
export async function readDir(dirPath: string) {
    if (__NODE_JS__) {
        const path = await import('path')
        const fs = await import('fs')
        async function* getFiles(dir: string): AsyncGenerator<string> {
            const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
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
        const fs = await import('fs')
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (yes) => {
                if (yes) {
                    fs.readFile(filePath, (err, file) => {
                        if (err) return reject(err)
                        resolve(file.toString())
                    })
                } else {
                    reject('File ' + filePath + ' does not exist.')
                }
            })
        })
    }
    throw new Error(errorMessage)
}

export async function writeFile(targetPath: string, data: string) {
    if (__NODE_JS__) {
        const path = await import('path')
        const fs = await import('fs')
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
        const path = await import('path')
        const fs = await import('fs')
        const dirname = path.dirname(targetPath)
        await fs.promises.mkdir(dirname, { recursive: true })
        await fs.promises.copyFile(filePath, targetPath)
        return
    }
    throw new Error(errorMessage)
}

export async function pathResolve(p: string) {
    if (__NODE_JS__) {
        const path = await import('path')
        return path.resolve(p)
    }
    throw new Error(errorMessage)
}

export async function pathJoin(...parts: string[]) {
    if (__NODE_JS__) {
        const path = await import('path')
        return path.join(...parts)
    }
    throw new Error(errorMessage)
}

export async function pathDirname(p: string) {
    if (__NODE_JS__) {
        const path = await import('path')
        return path.dirname(p)
    }
    throw new Error(errorMessage)
}
