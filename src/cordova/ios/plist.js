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
    obj.NSLocationWhenInUseUsageDescription = "Track distance and speed";


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
