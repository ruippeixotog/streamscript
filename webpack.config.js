const path = require("path");

module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, "src/webui/client/index.tsx"),
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      }
    ]
  },
  devtool: "inline-source-map",
  resolve: {
    extensions: ["*", ".js", ".ts", ".jsx", ".tsx"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    static: path.resolve(__dirname, "dist"),
  },
};
