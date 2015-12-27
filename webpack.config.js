
module.exports = {
    context: __dirname + "/src/main/js",
    entry: "./main.js",
    devtool: 'source-map',

    output: {
        filename: "app.js",
        path: __dirname + "/www/dist"
    }
}
