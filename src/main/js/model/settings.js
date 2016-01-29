'use strict';

var db = require('../db.js');

function Settings(version, units, syncOnlyOnWifi, restoreLayout) {
    this._version = version;
    this._units = units;
    this._syncOnlyOnWifi = syncOnlyOnWifi;
    this._restoreLayout = restoreLayout;
}

Settings.prototype.getVersion = function() {
    return this._version;
}

Settings.prototype.setVersion = function(version) {
    this._version = version;
}

Settings.prototype.getUnits = function() {
    return this._units;
}

Settings.prototype.setUnits = function(units) {
    this._units = units;
}

Settings.prototype.isSyncOnlyOnWifi = function() {
    return this._syncOnlyOnWifi;
}

Settings.prototype.setSyncOnlyOnWifi = function(syncOnlyOnWifi) {
    this._syncOnlyOnWifi = syncOnlyOnWifi;
}

Settings.prototype.getRestoreLayout = function() {
    return this._restoreLayout;
}

Settings.prototype.setSyncOnlyOnWifi = function(restoreLayout) {
    this._restoreLayout = restoreLayout;
}


function loadSettings() {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("SELECT * FROM settings", [], function (res) {
        var row = res.rows.item(0);
        console.log(res.rows.length);
        defer.resolve(new Settings(row.version, row.units, row.sync_wifi, row.restore_layout));
    });

    return defer.promise();
}

function saveSettings(units, syncOnWikiOnly, restoreLayout) {
    var connection = db.getConnection();
    connection.executeSql("update settings set units = ?, sync_wifi = ?, restore_layout = ?"
        , [units, syncOnWikiOnly ? 1 : 0, restoreLayout ? 1 : 0]);
}

exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.Settings = Settings;








