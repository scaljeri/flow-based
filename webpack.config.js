const path = require('path');

const config = {
  entry: './src/fractals-worker.ts',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'fractals-worker.js'
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: "ts-loader", options: {onlyCompileBundledFiles: true}}
      // , {
      //   test: /fractals-workerxxxxxxxxx\.ts$/,
      //   use: 'ts-loader',
      //   exclude: /spec\.ts$/
      // }
    ]
  },
};

module.exports = config;
