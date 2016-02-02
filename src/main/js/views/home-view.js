'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var Session = require('../model/session.js').Session;

function HomeView(page) {

    $('#btn-sessions', page).on('touchend', function () {
        App.load('sessions');
    });

    $('#btn-session', page).on('touchend', function () {
        var calibration = Calibration.load();
        if (calibration === undefined) {
            alert("No calibration: Got to Settings > Calibrate");
            return;
        }
        App.load('session');
    });

    $('#btn-settings', page).on('touchend', function () {
        App.load('settings');
    });

    $('.home-username-bold', page).html(Paddler.Session.getUser().getFullName());

    Session.last().then(function (session) {
        if (session === undefined) {
            $('.home-last-record', page).html('No sessions yet');
        } else {
            $('.home-last-record-date', page).html(moment(session.getSessionStart()).format('MMM D'));
        }
    });

    // store device information
    Paddler.Authentication.saveUserDevice({
        cordova: device.cordova,
        model: device.model,
        platform: device.platform,
        uuid: device.uuid,
        version: device.version,
        manufacturer: device.manufacturer,
        isVirtual: device.isVirtual,
        serial: device.serial
    });
}

exports.HomeView = HomeView;