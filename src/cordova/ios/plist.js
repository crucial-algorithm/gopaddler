#!/usr/local/bin/node

var fs = require('fs');
var plist = require('plist');

var FILEPATH = 'platforms/ios/GoPaddler/GoPaddler-Info.plist';

function overridePlist(context) {
    var xml = fs.readFileSync(FILEPATH, 'utf8');
    var obj = plist.parse(xml);

    obj.UIStatusBarHidden = true;
    obj.UIViewControllerBasedStatusBarAppearance = false;
    obj.CFBundleDisplayName = "GoPaddler";
    obj.NSLocationWhenInUseUsageDescription = "track distance and speed";
    obj.NSLocationAlwaysUsageDescription = "track distance and speed";
    obj.NSBluetoothPeripheralUsageDescription = "gopaddler requires Bluetooth to connect to heart rate monitors";


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
