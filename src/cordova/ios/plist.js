#!/usr/local/bin/node

var fs = require('fs');
var plist = require('plist');

if (!process.env.APP) throw 'APP enviornement variable need to be set to either gopaddler or uttercycling'

var FILEPATH = process.env.APP === 'gopaddler' ? 'platforms/ios/GoPaddler/GoPaddler-Info.plist' : 'platforms/ios/Utter Cycling/Utter Cycling-Info.plist';
var APP_NAME = process.env.APP === 'gopaddler' ? "GoPaddler" : "Utter Cycling";

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
