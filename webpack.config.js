var webpack = require("webpack");

var env = process.env.NODE_ENV;
var viewMode = process.env.VIEW_MODE || 'landscape';
var isPortraitMode = false;

if (viewMode === 'portrait') {
    isPortraitMode = 1;
}

var CONFIG = {
    common: {
        version: "1.0.2",
        apiVersion: 1
    },
    dev : {
        server: "http://local.gopaddler.com",
        endpoint: "ws://local.gopaddler.com/websocket"
    },
    "remote-dev": {
        server: "https://dev.gopaddler.com",
        endpoint: "wss://dev.gopaddler.com/websocket"
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


if (env !== 'dev' && env !== 'prod' && env !== 'remote-dev')
    throw 'Unknown env. Allowed are: "dev" or "prod" ';

var config = extend({}, CONFIG.common, CONFIG[env]);


module.exports = {
    context: __dirname + "/src/main/js",
    entry: "./main.js",
    devtool: env === 'dev' || env === 'remote-dev' ? 'source-map' : undefined,

    output: {
        filename: "app.js",
        path: __dirname + "/www/dist"
    },
    plugins:[
        new webpack.DefinePlugin({
            __WS_ENDPOINT__: JSON.stringify(config.endpoint),
            __WEB_URL__: JSON.stringify(config.server),
            __VERSION__: JSON.stringify(config.version),
            __IS_PORTRAIT_MODE__: JSON.stringify(isPortraitMode),
            __API_VERSION__: JSON.stringify(config.apiVersion)
        })
    ],
    module: {
        rules: [
            {
                test: /\.svg$/,
                loader: "file-loader"
            },
            {
                test: /\.jpg$/,
                loader: "file-loader"
            }, {
                test: /\.png$/,
                loader: "url-loader?mimetype=image/png"
            }, {
                test: /\.art.html$/,
                loader: "art-template-loader",
                options: {
                    // art-template options (if necessary)
                    // @see https://github.com/aui/art-template
                }
            }
        ]
    }
};
