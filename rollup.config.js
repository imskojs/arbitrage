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
    nodeResolve({ jsnext: true, main: true }),
    uglify({}, minify)
  ]
};