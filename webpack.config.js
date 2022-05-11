var path = require('path');

module.exports = {
  entry: {
    server: './node_modules/@scaipproxy/core/server.js',
    rest: './node_modules/@scaipproxy/rest/rest.js'
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, 'libs')
  },
  devtool: "source-map",
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
