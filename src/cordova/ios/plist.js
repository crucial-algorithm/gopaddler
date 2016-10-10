#!/usr/local/bin/node

var fs = require('fs');
var plist = require('plist');

var FILEPATH = 'platforms/ios/Paddler/Paddler-Info.plist';

function overridePlist(context) {
    var xml = fs.readFileSync(FILEPATH, 'utf8');
    var obj = plist.parse(xml);

    obj.UIStatusBarHidden = true;
    obj.UIViewControllerBasedStatusBarAppearance = false;
    obj.CFBundleDisplayName = "Paddler";

    xml = plist.build(obj);
    fs.writeFileSync(FILEPATH, xml, {encoding: 'utf8'});
}

module.exports = overridePlist;
