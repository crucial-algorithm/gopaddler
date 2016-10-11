'use strict';

var db = require('../db.js');

var CONSTANTS  = {
    KM: 'K',
    MI: 'M'
};

function Settings(version, units, syncOnlyOnWifi, restoreLayout, showTouchGestures, showCalibrationTips, default_session_filter, default_start_date, default_end_date) {
    this._version = version;
    this._units = units;
    this._syncOnlyOnWifi = syncOnlyOnWifi;
    this._restoreLayout = restoreLayout;
    this._showTouchGestures = showTouchGestures === undefined ? true : showTouchGestures;
    this._showCalibrationTips = showCalibrationTips === undefined ? true : showCalibrationTips;
    this._defaultSessionFilter = default_session_filter;
    this._defaultStartDate = default_start_date;
    this._defaultEndDate = default_end_date;
}

Settings.prototype.getVersion = function() {
    return this._version;
};

Settings.prototype.setVersion = function(version) {
    this._version = version;
};

Settings.prototype.getUnits = function() {
    return this._units;
};

Settings.prototype.setUnits = function(units) {
    this._units = units;
};

Settings.prototype.isImperial = function(){
    return this._units === CONSTANTS.MI;
};

Settings.prototype.isSyncOnlyOnWifi = function() {
    return this._syncOnlyOnWifi;
};

Settings.prototype.setSyncOnlyOnWifi = function(syncOnlyOnWifi) {
    this._syncOnlyOnWifi = syncOnlyOnWifi;
};

Settings.prototype.isRestoreLayout = function() {
    return this._restoreLayout;
};

Settings.prototype.setRestoreLayout = function(restoreLayout) {
    this._restoreLayout = restoreLayout;
};

Settings.prototype.isShowTouchGestures = function () {
    return this._showTouchGestures;
};

Settings.prototype.setShowTouchGestures = function (showTouchGestures) {
    this._showTouchGestures = showTouchGestures;
};

Settings.prototype.isShowCalibrationTips = function () {
    return this._showCalibrationTips;
};

Settings.prototype.setShowCalibrationTips = function (showCalibrationTips) {
    this._showCalibrationTips = showCalibrationTips;
};

Settings.prototype.getDefaultSessionFilter = function() {
    return this._defaultSessionFilter;
};

Settings.prototype.setDefaultSessionFilter = function(defaultSessionFilter) {
    this._defaultSessionFilter = defaultSessionFilter;
};

Settings.prototype.getDefaultStartDate = function() {
    return this._defaultStartDate;
};

Settings.prototype.setDefaultStartDate = function(defaultStartDate) {
    this._defaultStartDate = defaultStartDate;
};

Settings.prototype.getDefaultEndDate = function() {
    return this._defaultEndDate;
};

Settings.prototype.setDefaultEndDate = function(defaultEndDate) {
    this._defaultEndDate = defaultEndDate;
};



Settings.prototype.touchGesturesShown = function () {
    var connection = db.getConnection();
    connection.executeSql("update settings set show_touch_events_tips = ?", [0]);
    this.setShowTouchGestures(false);
}

Settings.prototype.calibrationTipsShown = function () {
    var connection = db.getConnection();
    connection.executeSql("update settings set show_calibration_tips = ?", [0]);
    this.setShowCalibrationTips(false);
}


function loadSettings() {
    var defer = $.Deferred();
    var connection = db.getConnection();

    connection.executeSql("SELECT * FROM settings", [], function success(res) {
        var row = res.rows.item(0);
        defer.resolve(
            new Settings(
                row.version,
                row.units,
                row.sync_wifi,
                row.restore_layout,
                row.show_touch_events_tips === 1,
                row.show_calibration_tips === 1,
                row.default_session_filter,
                row.default_start_date,
                row.default_end_date
            ));
    }, function error(e) {
        console.log('error loding settings... defaulting');
        defer.reject(err, new Settings(-1, CONSTANTS.KM, true, true));
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
exports.CONSTANTS  = CONSTANTS;








