import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import fs from 'fs';

export default {
  input: './dist/chat-system/browser/main.js',
  output: {
    file: './dist/jfc.chat.js',
    format: 'iife', // immediately-invoked function expression
    name: 'ChatWidget'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};
