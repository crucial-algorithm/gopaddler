#!/usr/bin/env node
const fs = require('fs');

function getApp() {
    return new Promise((resolve, reject) => {
        fs.readFile('.app', 'utf8', function (err, app) {
            if (err) {
                reject(err);
                return;
            }
            app = app.trimEnd();
            resolve(app);
        });
    });
}


getApp().then(function (app) {
    console.log('app = >', app);
    fs.readFile('./config/config-template.xml', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        const config = require(`../config/${app}`);
        data = data.replace(/{{APP}}/g, app);
        data = data.replace(/{{VERSION_CODE}}/g, config.cordova.versionCode);
        data = data.replace(/{{APP_ID}}/g, config.cordova.id);
        data = data.replace(/{{APP_VERSION}}/g, config.cordova.version);
        data = data.replace(/{{APP_NAME}}/g, config.cordova.name);
        data = data.replace(/{{APP_DESCRIPTION}}/g, config.cordova.description);
        data = data.replace(/{{AUTHOR_EMAIL}}/g, config.cordova.authorEmail);
        data = data.replace(/{{AUTHOR_HREF}}/g, config.cordova.authorHref);
        data = data.replace(/{{AUTHOR_TEAM}}/g, config.cordova.author);

        fs.writeFile('./config.xml', data, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    })
}).catch(printHelp);

function printHelp() {
    console.error('Please provide a valid app by creating a .app file with [gopaddler|uttercycling]');
    process.exit(1);
}



