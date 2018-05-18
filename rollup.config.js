import nodeResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
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
    nodeResolve({ jsnext: true, main: true }),
    commonjs({ include: ['node_modules/rxjs/**', 'node_modules/ramda/**'] }),
    uglify({}, minify)
  ]
};