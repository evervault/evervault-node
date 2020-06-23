import filesize from 'rollup-plugin-filesize';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
//import { terser } from 'rollup-plugin-terser';
import externals from 'rollup-plugin-node-externals';

import pkg from './package.json';

export default {
  input: 'lib/index.ts',
  output: [
    {
      name: pkg.name,
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      name: pkg.name,
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    externals({
      packagePath: './package.json',
      builtins: true,
    }),
    resolve(),
    json(),
    cjs({
      include: /node_modules/,
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
    }),
    //terser(),
    filesize(),
  ],
};
