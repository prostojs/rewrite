import { dts } from 'rollup-plugin-dts'

export default {
    input: './src/index.ts',
    output: {
        file: './dist/index.d.ts',
        format: 'es',
        sourcemap: false,
    },
    plugins: [
        dts({
            tsconfig: 'tsconfig.json',
            compilerOptions: {
                removeComments: false,
            },
        }),
    ],
}
