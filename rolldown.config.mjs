import dyePlugin from '@prostojs/dye/rolldown'

const external = ['@prostojs/parser', 'minimatch', 'path', 'fs', 'fs/promises']

export default [
    {
        external,
        input: './src/index.ts',
        output: {
            file: './dist/index.mjs',
            format: 'esm',
            sourcemap: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            __NODE_JS__: 'true',
            __BROWSER__: 'false',
        },
        plugins: [dyePlugin()],
    },
    {
        external,
        input: './src/index.ts',
        output: {
            file: './dist/index.cjs',
            format: 'cjs',
            sourcemap: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            __NODE_JS__: 'true',
            __BROWSER__: 'false',
        },
        plugins: [dyePlugin()],
    },
]
