import filesize from 'rollup-plugin-filesize';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

import pkg from './package.json';

const externals = pkg.dependencies;

const formats = ['cjs', 'esm'];

export default {
  input: 'lib/index.ts',
  output: formats.map((format) => ({
    file: `dist/evervault.${format}.js`,
    format,
    name: pkg.name,
    sourcemap: true,
  })),
  plugins: [
    resolve(),
    json(),
    cjs({
      include: /node_modules/,
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
    }),
    filesize(),
  ],
  external: externals,
};
