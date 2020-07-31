#!/usr/local/bin/node

let fs = require('fs');
let plist = require('plist');


let app = '', FILEPATH, APP_NAME;
try {
    app = fs.readFileSync('.app', {encoding: 'utf8', flag: 'r'});
    app = app.trimEnd();
    if (['uttercycling', 'gopaddler'].indexOf(app) < 0) {
        console.error('unknown app found in .app; Known target apps are: gopaddler | uttercycling');
        process.exit(0);
    }
    FILEPATH = app === 'gopaddler' ? 'platforms/ios/GoPaddler/GoPaddler-Info.plist' : 'platforms/ios/Utter Cycling/Utter Cycling-Info.plist';
    APP_NAME = app === 'gopaddler' ? "GoPaddler" : "Utter Cycling";
} catch (err) {

    if (err.code === 'ENOENT') {
        console.log('missing .app file: create .app file in root dir with the name of the app this project folder is target at (gopaddler|uttercycling)');
        process.exit(0);
    } else {
        console.error(err);
        process.exit(1);
    }
}

function overridePlist(context) {
    var xml = fs.readFileSync(FILEPATH, 'utf8');
    var obj = plist.parse(xml);

    obj.UIStatusBarHidden = true;
    obj.UIViewControllerBasedStatusBarAppearance = false;
    obj.CFBundleDisplayName = APP_NAME;
    obj.NSLocationWhenInUseUsageDescription = "track distance and speed";
    obj.NSLocationAlwaysUsageDescription = "track distance and speed";
    obj.NSLocationAlwaysAndWhenInUseUsageDescription = "track distance and speed";
    obj.NSBluetoothPeripheralUsageDescription = "Connect to BLE sensores for cadence and heart rate";
    obj.UIBackgroundModes = ["bluetooth-central", "location"];

    obj.UISupportedInterfaceOrientations = [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeRight"
    ];
    obj["UISupportedInterfaceOrientations~ipad"] = [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeRight"
    ];

    xml = plist.build(obj);
    fs.writeFileSync(FILEPATH, xml, {encoding: 'utf8'});
}

module.exports = overridePlist;
