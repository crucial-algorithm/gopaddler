const webpack = require("webpack");
const fs = require('fs');

const env = process.env.NODE_ENV;
const viewMode = process.env.VIEW_MODE || 'landscape';
let isPortraitMode = false;
let exec = require('child_process').exec;

if (viewMode === 'portrait') {
    isPortraitMode = 1;
}
let app = '';
try {
    app = fs.readFileSync('.app', {encoding: 'utf8', flag: 'r'});
    app = app.trimEnd();
} catch (err) {
    if (err.code === 'ENOENT') {
        console.log('missing .app file: create .app file in root dir with the name of the app this project folder is target at (gopaddler|uttercycling)');
        process.exit(0);
    } else {
        console.error(err);
        process.exit(1);
    }
}

if (env !== 'dev' && env !== 'prod' && env !== 'remote-dev')
    throw 'Unknown env. Allowed are: "dev" or "prod" ';

if (app !== 'gopaddler' && app !== 'uttercycling')
    throw 'Unknown app. Allowed are: "gopaddler" or "uttercycling"! You may be missing .app file ';

let config = require(`./config/${app}`);

let log = `**       Building for ${app} / ${env} | Screen = ${isPortraitMode ? 'Portrait' : 'Landscape'}       **`;
let separator = Array(log.length).fill('*').join('');

console.log(`${separator}\n${log}\n${separator}\n\n`);

module.exports = (_, argv) => {
    const isReleaseVersion = argv.mode === 'production';
    return {
        context: __dirname + "/src/main/js",
        entry: "./main.js",
        devtool: env === 'dev' || env === 'remote-dev' ? 'source-map' : undefined,

        output: {
            filename: "app.js",
            path: __dirname + "/www/dist"
        },
        plugins:[
            new webpack.DefinePlugin({
                __WS_ENDPOINT__: JSON.stringify(config.src.endpoints[env].endpoint),
                __WEB_URL__: JSON.stringify(config.src.endpoints[env].server),
                __VERSION__: JSON.stringify(config.cordova.version),
                __IS_PORTRAIT_MODE__: JSON.stringify(isPortraitMode),
                __API_VERSION__: JSON.stringify(config.src.versioning.apiVersion),
                __SESSION_FORMAT_VERSION__: JSON.stringify(config.src.versioning.sessionVersion),
                __APP__: JSON.stringify(app),
                __APP_CONFIG__: JSON.stringify(config.src)
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

                        exec('cp -rf www/css/* www/dist/app.js.map platforms/android/app/src/main/assets/www/css/', (err, stdout, stderr) => {
                            if (stdout) process.stdout.write(stdout);
                            if (stderr) process.stderr.write(stderr);
                            if (!stdout && !stderr) console.log('... hot swap css in android platform');
                        });
                    });
                }
            },
            {
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                        // hook that replaces javascript files in android project so running is faster (by just opening android studio and running from there)
                        exec('cp -f www/dist/app.js www/dist/app.js.map platforms/ios/www/dist/', (err, stdout, stderr) => {
                            if (stdout) process.stdout.write(stdout);
                            if (stderr) process.stderr.write(stderr);
                            if (!stdout && !stderr) console.log('... hot swap js in ios platform');
                        });

                        exec('cp -rf www/css/* www/dist/app.js.map platforms/ios/www/css/', (err, stdout, stderr) => {
                            if (stdout) process.stdout.write(stdout);
                            if (stderr) process.stderr.write(stderr);
                            if (!stdout && !stderr) console.log('... hot swap css in ios platform');
                        });
                    });
                }
            },
            {
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                        if (isReleaseVersion === false) return;
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
    }
}
