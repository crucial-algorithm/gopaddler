var webpack = require("webpack");

var env = process.env.NODE_ENV;

module.exports = {
    context: __dirname + "/src/main/js",
    entry: "./main.js",
    devtool: env === 'dev' ? 'source-map' : undefined,

    output: {
        filename: "app.js",
        path: __dirname + "/www/dist"
    },
    plugins: env === 'dev' ? [] : [
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: true}
        })
    ]
}
