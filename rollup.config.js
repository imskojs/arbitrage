import builtins from "rollup-plugin-node-builtins";
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from "rollup-plugin-node-resolve";
import uglify from "rollup-plugin-uglify";
import { minify } from "uglify-es";

export default {
  input: './src/index.js',
  output: {
    file: './build/index.js',
    format: 'cjs'
  },
  onwarn: (warning) => {
    console.warn(warning.message);
  },
  plugins: [
    builtins(),
    nodeResolve(),
    commonjs({
      include: [
        'dotenv'
      ].map(lib => `node_modules/${lib}/**`)
    }),
    uglify({}, minify)
  ]
};