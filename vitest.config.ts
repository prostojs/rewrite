import { defineConfig, type Plugin } from 'vitest/config'
import { createDyeReplacements } from '@prostojs/dye/common'

function dyeReplacePlugin(): Plugin {
    const replacements = createDyeReplacements()
    return {
        name: 'dye-replace',
        enforce: 'pre',
        transform(code, id) {
            if (!id.includes('node_modules')) {
                let result = code
                for (const [key, value] of Object.entries(replacements)) {
                    result = result.replaceAll(key, value)
                }
                if (result !== code) return result
            }
        },
    }
}

export default defineConfig({
    define: {
        __NODE_JS__: 'true',
        __BROWSER__: 'false',
    },
    plugins: [dyeReplacePlugin()],
    test: {
        globals: true,
        include: ['src/__test__/**/*.spec.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['html', 'lcov', 'text'],
            include: ['src/**/*.ts'],
        },
    },
})
