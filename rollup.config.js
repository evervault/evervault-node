const filesize = require('rollup-plugin-filesize');
const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

const formats = ['cjs', 'esm'];

export default {
  input: 'lib/index.ts',
  output: formats.map((format) => ({
    file: `dist/${format}.js`,
    format,
    name: pkg.name,
    sourcemap: true,
  })),
  plugins: [
    typescript({
      tsconfig: './tsconfig.build.json',
    }),
    filesize(),
  ],
};
