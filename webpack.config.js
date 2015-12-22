
module.exports = {
    context: __dirname + "/src/js",
    entry: "./main.js",
    devtool: 'source-map',

    output: {
        filename: "app.js",
        path: __dirname + "/www/dist"
    }
}
