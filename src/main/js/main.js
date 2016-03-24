'use strict';

var SessionView = require('./views/session-view.js').SessionView;
var SessionSummaryView = require('./views/session-summary.js').SessionSummaryView;
var SettingsView = require('./views/settings-view.js').SettingsView;
var HomeView = require('./views/home-view.js').HomeView;
var LoginView = require('./views/login-view.js').LoginView;
var SessionsView = require('./views/sessions-view.js').SessionsView;
var CalibrationView = require('./views/calibration-view.js').CalibrationView;
var SessionTipsView = require('./views/session-tips-view.js').SessionTipsView;
var Api = require('./server/api');
var utils = require('./utils/utils.js');
var global = require('./global.js');
var db = require('./db.js');
var sync = require('./server/sync.js');
var analytics = require('./utils/analytics.js');
var Settings = require('./model/settings');
var Context = require('./context').Context;

var settings = undefined;
var context = undefined;


/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {
    analytics.setView('login');
    screen.lockOrientation('portrait');
    new LoginView(page);
});

App.controller('home', function (page) {
    analytics.setView('home');
    analytics.setUser(Api.User.getId());
    screen.lockOrientation('landscape');
    Settings.loadSettings().then(function (s) {
        settings = s;
        context = new Context(settings);
        new HomeView(page, context);
    }).fail(function (error, defaultSettings) {
            settings = defaultSettings;
            context = new Context(settings);
        });
});

/**
 * New session page.
 */
App.controller('session', function (page) {
    analytics.setView('session');
    new SessionView(page, context);
});

App.controller('session-summary', function (page, session) {
    analytics.setView('session-summary');
    new SessionSummaryView(page, context, session);
});

/**
 * Settings page.
 */
App.controller('settings', function (page) {
    analytics.setView('settings');
    new SettingsView(page, settings);
});

/**
 * Session list page.
 */
App.controller('sessions', function (page) {
    analytics.setView('sessions');
    new SessionsView(page, context);
});

/**
 * Calibration page.
 */
App.controller('calibration', function (page) {
    analytics.setView('calibration');
    new CalibrationView(page);
});

/**
 * Pause and swipe session tutorial page.
 */
App.controller('session-basic-touch-tutorial', function (page) {
    analytics.setView('session-touch-tips-tutorial');
    new SessionTipsView(page, context);
});

function onDeviceReady() {
    document.pd_device_ready = true;

    utils.mapBrowserToNative();

    loadDb();
    navigator.splashscreen.hide();

    setTimeout(function () {
        loadUi();
    }, 3000);
}

if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
    document.addEventListener("deviceready", onDeviceReady, false);
} else {
    // in browser, development mode!
    global.emulateCordova();
    loadDb();
    Api.User.set({
        _id: -1,
        profile: {
            name: 'local-test-user'
        }
    });
    // go direct to home, without going through authentication
    App.load('home');
}

function loadDb() {
    db.init();
    sync.start();
}

function loadUi() {

    analytics.init();

    Api.Auth.login().done(function () {
        App.load('home');
    }).fail(function () {
        App.load('login');
    });
}