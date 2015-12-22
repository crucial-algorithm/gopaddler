
module.exports = {
    context: __dirname + "/js",
    entry: "./main.js",
    devtool: 'source-map',

    output: {
        filename: "app.js",
        path: __dirname + "/dist"
    }
}
