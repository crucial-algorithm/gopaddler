var webpack = require("webpack");

const env = process.env.NODE_ENV;
const app = process.env.app;
const viewMode = process.env.VIEW_MODE || 'landscape';
var isPortraitMode = false;
var exec = require('child_process').exec;

if (viewMode === 'portrait') {
    isPortraitMode = 1;
}

var CONFIG = {
    common: {
        version: "1.6.0",
        apiVersion: 2,
        sessionVersion: 5
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
    for (let i = 1; i < arguments.length; i++) {
        for (let key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
        }
    }
    return arguments[0];
}

console.log("... env = ", env, " app = ", app);
if (env !== 'dev' && env !== 'prod' && env !== 'remote-dev')
    throw 'Unknown env. Allowed are: "dev" or "prod" ';

if (app !== 'gopaddler' && app !== 'uttercycling')
    throw 'Unknown app. Allowed are: "gopaddler" or "uttercycling" ';

console.log('building for app ' + app);

let config = extend({}, CONFIG.common, CONFIG[env]);

const GOPADDLER_CONFIG = require('./config/gopaddler');
const UTTERCYCLING_CONFIG = require('./config/uttercycling');

let appConfig = app === 'gopaddler' ? GOPADDLER_CONFIG : UTTERCYCLING_CONFIG;

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
            __API_VERSION__: JSON.stringify(config.apiVersion),
            __SESSION_FORMAT_VERSION__: JSON.stringify(config.sessionVersion),
            __APP__: JSON.stringify(app),
            __APP_CONFIG__: JSON.stringify(appConfig.src)
        }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                    // hook that replaces javascript files in android project so running is faster (by just opening android studio and running from there)
                    exec('cp -f www/dist/app.js www/dist/app.js.map platforms/android/app/src/main/assets/www/dist/', (err, stdout, stderr) => {
                        if (stdout) process.stdout.write(stdout);
                        if (stderr) process.stderr.write(stderr);
                        if (!stdout && !stderr) console.log('... hot swap js in android platform');
                    });

                    exec('cp -f www/css/* www/dist/app.js.map platforms/android/app/src/main/assets/www/css/', (err, stdout, stderr) => {
                        if (stdout) process.stdout.write(stdout);
                        if (stderr) process.stderr.write(stderr);
                        if (!stdout && !stderr) console.log('... hot swap js in android platform');
                    });
                });
            }
        },
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                    // override config.xml setttings for the specific app we are building to
                    exec(`./scripts/generate-config-for-app.js ${app}`, (err, stdout, stderr) => {
                        if (stdout) process.stdout.write(stdout);
                        if (stderr) process.stderr.write(stderr);
                        if (!stdout && !stderr) console.log('... rewrite config.xml');
                    });
                });
            }
        }
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
            }, {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    stats: {
        colors: true
    }
};
