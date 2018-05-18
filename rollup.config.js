import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from "rollup-plugin-node-resolve";
// import uglify from "rollup-plugin-uglify";
// import { minify } from "uglify-es";

export default {
  input: './src/index.js',
  output: {
    file: './build/build.js',
    format: 'cjs'
  },
  onwarn: (warning) => {
    console.warn(warning.message);
  },
  plugins: [
    nodeResolve(),
    commonjs()
    // uglify({}, minify)
  ],
  external: [
    ...builtInModules()
  ]
};




// Helper

function builtInModules() {
  return [
    "assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto",
    "dgram", "dns", "domain", "events", "fs", "http", "http2", "https", "inspector", "module", "net",
    "os", "path", "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream",
    "string_decoder", "timers", "tls", "tty", "url", "util", "v8", "vm", "zlib"
  ];
}