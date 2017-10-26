var webpack = require("webpack");

var env = process.env.NODE_ENV;


var CONFIG = {
    common: {
        version: "0.9.7d"
    },
    dev : {
        server: "http://local.gopaddler.com:3000",
        endpoint: "ws://local.gopaddler.com:3000/websocket"
    },
    prod: {
        server: "https://app.gopaddler.com",
        endpoint: "wss://app.gopaddler.com/websocket"
    }

};


function extend() {
    for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
        }
    }
    return arguments[0];
}


if (env !== 'dev' && env !== 'prod')
    throw 'Unknown env. Allowed are: "dev" or "prod" ';

var config = extend({}, CONFIG.common, CONFIG[env]);


module.exports = {
    context: __dirname + "/src/main/js",
    entry: "./main.js",
    devtool: env === 'dev' ? 'source-map' : undefined,

    output: {
        filename: "app.js",
        path: __dirname + "/www/dist"
    },
    plugins:[
        new webpack.DefinePlugin({
            __WS_ENDPOINT__: JSON.stringify(config.endpoint),
            __WEB_URL__: JSON.stringify(config.server),
            __VERSION__: JSON.stringify(config.version)
        })
    ],
    module: {
        rules: [
            {
                test: /\.html$/,
                use: [ "html-loader" ]
            }
        ]
    }
};
