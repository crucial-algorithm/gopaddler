#!/usr/local/bin/node

var fs    = require('fs');
var plist = require('plist');

var FILEPATH = 'platforms/ios/Paddler/Paddler-Info.plist';

module.exports = function (context) {


    var xml = fs.readFileSync(FILEPATH, 'utf8');
    var obj = plist.parse(xml);

    obj.UIStatusBarHidden = true;
    obj.UIViewControllerBasedStatusBarAppearance = false;

    xml = plist.build(obj);
    fs.writeFileSync(FILEPATH, xml, { encoding: 'utf8' });
};