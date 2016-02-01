'use strict';

var SessionView = require('./views/session-view.js').SessionView;
var SettingsView = require('./views/settings-view.js').SettingsView;
var HomeView = require('./views/home-view.js').HomeView;
var LoginView = require('./views/login-view.js').LoginView;
var SessionsView = require('./views/sessions-view.js').SessionsView;
var CalibrationView = require('./views/calibration-view.js').CalibrationView;
var utils = require('./utils/utils.js');
var global = require('./global.js');
var db = require('./db.js');
var sync = require('./server/sync.js');
var analytics = require('./utils/analytics.js');

/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {
    analytics.setView('login');
    new LoginView(page);
});

App.controller('home', function (page) {
    analytics.setView('home');
    analytics.setUser(Paddler.Session.getUser().getId());
    new HomeView(page);
});

/**
 * New session page.
 */
App.controller('session', function (page) {
    analytics.setView('session');
    new SessionView(page);
});

/**
 * Settings page.
 */
App.controller('settings', function (page) {
    analytics.setView('settings');
    new SettingsView(page);
});

/**
 * Session list page.
 */
App.controller('sessions', function (page) {
    analytics.setView('sessions');
    new SessionsView(page);
});

/**
 * Calibration page.
 */
App.controller('calibration', function (page) {
    analytics.setView('calibration');
    new CalibrationView(page);
});

function onDeviceReady() {
    document.pd_device_ready = true;

    utils.mapBrowserToNative();

    loadDb();
    loadUi();
}

document.pd_device_ready = false;
if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
    document.addEventListener("deviceready", onDeviceReady, false);
} else {
    global.emulateCordova();
    loadDb();
    Paddler.Session.init();
    Paddler.Session.setUser(new Paddler.User(-1, 'local-test-user', 'local', 'test', 'local.test@gmail.com', undefined));
    Paddler.Session.setAccessToken('test-access-token');
    loadUi();
}

function loadDb() {
    db.init();
    sync.start();
}

var processing = {};

function loadUi() {
    analytics.init();
    Paddler.Authentication.autoLogin(true).done(function() {
        App.load('home');
    }).fail(function() {
        App.load('login');
    });
}