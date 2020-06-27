#!/usr/bin/env node
const fs = require('fs');

const args = process.argv.slice(2);

if (args.length === 0) {
    printHelp();
} else if (args[0] !== 'gopaddler' && args[0] !== 'uttercycling') {
    printHelp();
}

const app = args[0];

const config = require(`../config/${app}`);

fs.readFile('./config/config-template.xml', 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
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
});

function printHelp() {
    const scriptPath = process.argv[1].split('/');
    const scriptName = scriptPath[scriptPath.length - 1];
    console.error(`Please provide a valid app. \nUsage: ${scriptName} [gopaddler|uttercycling]`);
    process.exit(1);
}



