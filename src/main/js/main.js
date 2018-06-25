'use strict';

var SessionView = require('./views/session.view.js').SessionView;
var SessionSummaryView = require('./views/session.summary.js').SessionSummaryView;
var SettingsView = require('./views/settings.view.js').SettingsView;
var HomeView = require('./views/home.view.js').HomeView;
var LoginView = require('./views/login.view.js').LoginView;
var SessionsView = require('./views/sessions.view.js').SessionsView;
var CalibrationView = require('./views/calibration.view.js').CalibrationView;
var CalibrationHelpView = require('./views/calibration.help.view.js').CalibrationHelpView;
var BluetoothView = require('./views/bluetooth.view').BluetoothView;
var SessionTipsView = require('./views/session.tips.view.js').SessionTipsView;
var SelectSessionView = require('./views/select.session.view').SelectSessionView;
var LoginWithPassword = require('./views/login.with.password.view').LoginWithPasswordView;
var ChooseBoatView = require('./views/choose.boat.view').ChooseBoatView;
var DefineGPSSpeedView = require('./views/define.gps.update.rate.view').DefineGPSSpeedView;
var DefineMaxHeartRateView = require('./views/define.max.heart.rate.view').DefineMaxHeartRateView;
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
var environment = undefined;

function enrichPageArg(page) {
    var $page = $(page);
    var callbacks = [];
    var appShown = false;

    $page.off('appShow').on('appShow', function() {
        appShown = true;
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i].apply({}, [])
        }
    });

    page.onShown = {
        then: function (callback) {
            callbacks.push(callback);
            if (appShown) {
                setTimeout(function () {
                    callback.apply({}, []);
                }, 0);
            }
        }
    };
}

/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {
    analytics.setView('login');
    enrichPageArg(page);
    new LoginView(page);
});

App.controller('login-with-password', function (page) {
    analytics.setView('login-with-password');
    enrichPageArg(page);
    new LoginWithPassword(page, context);
});

App.controller('home', function (page, request) {
    analytics.setView('home');
    analytics.setUser(Api.User.getId());
    enrichPageArg(page);
    Settings.loadSettings().then(function (s) {
        settings = s;
        context = new Context(settings, environment);

        if (environment === 'prod')
            sync.start(context);

        new HomeView(page, context, request);
    }).fail(function (error, defaultSettings) {
        settings = defaultSettings;
        context = new Context(settings, environment);
    });
});

/**
 * New session page.
 */
App.controller('session', function (page, scheduledSession) {
    analytics.setView('session');
    enrichPageArg(page);
    new SessionView(page, context, scheduledSession);
});

App.controller('session-summary', function (page, session) {
    analytics.setView('session-summary');
    enrichPageArg(page);
    new SessionSummaryView(page, context, session);
});

/**
 * Settings page.
 */
App.controller('settings', function (page) {
    analytics.setView('settings');
    enrichPageArg(page);
    new SettingsView(page, context, settings);
});

/**
 * Session list page.
 */
App.controller('sessions', function (page) {
    analytics.setView('sessions');
    enrichPageArg(page);
    context = new Context(context.preferences(), environment);
    new SessionsView(page, context);
});

/**
 * Calibration page.
 */
App.controller('calibration', function (page, request) {
    analytics.setView('calibration');
    enrichPageArg(page);
    new CalibrationView(page, context, request);
});

/**
 * Pause and swipe session tutorial page.
 */
App.controller('session-basic-touch-tutorial', function (page) {
    analytics.setView('session-touch-tips-tutorial');
    enrichPageArg(page);
    new SessionTipsView(page, context);
});

/**
 * Calibration tutorial
 */
App.controller('calibration-help', function (page, request) {
    analytics.setView('calibration-help');
    enrichPageArg(page);
    new CalibrationHelpView(page, context, request);
});

/**
 * Bluetooth devices paring
 */
App.controller('bluetooth', function (page, request) {
    analytics.setView('bluetooth');
    enrichPageArg(page);
    new BluetoothView(page, context, request);
});

App.controller('select-session', function (page, request) {
    analytics.setView('select-session');
    enrichPageArg(page);
    new SelectSessionView(page, context, request);
});

App.controller('choose-boat', function (page, request) {
    analytics.setView('choose-boat');
    enrichPageArg(page);
    Settings.loadSettings().then(function (s) {
        settings = s;
        context = new Context(settings, environment);
        new ChooseBoatView(page, context)
    }).fail(function (error, defaultSettings) {
        settings = defaultSettings;
        context = new Context(settings, environment);
        new ChooseBoatView(page, context)
    });

});

App.controller('define-gps-update-rate', function (page, request) {
    analytics.setView('define-gps-update-rate');
    enrichPageArg(page);
    new DefineGPSSpeedView(page, context);
});

App.controller('define-max-heart-rate', function (page, request) {
    analytics.setView('define-max-heart-rate');
    enrichPageArg(page);
    new DefineMaxHeartRateView(page, context);
});

function onDeviceReady() {
    document.pd_device_ready = true;

    utils.mapBrowserToNative();

    loadDb();

    setTimeout(function () {
        loadUi();
    }, 2000);
}

if (navigator.userAgent === 'gp-dev-ck') {
    environment = 'dev';
    document.PREVENT_SYNC = true;
} else {
    environment = 'prod';
}

if (environment === 'prod') {
    document.addEventListener("deviceready", onDeviceReady, false);

} else {

    // in browser (development mode!)
    global.emulateCordova();
    loadDb();
    loadUi();
}

function loadDb() {
    db.init();
}

function loadUi() {

    analytics.init();

    // hack - for some reason, when not connected, screen orientation may not be properly set
    checkOrientationHack();

    Api.Server.connect();

    Api.Auth.login().done(function () {
        if (Api.User.hasChosenBoat())
            App.load('home');
        else
            App.load('choose-boat');
    }).fail(function () {
        App.load('login');
    });
}


function checkOrientationHack() {
    if (!utils.isNetworkConnected()) {

        var reloaded = JSON.parse(localStorage.getItem('forced-reload'));
        if ( !reloaded || (new Date().getTime() - reloaded) > 5000) {

            localStorage.setItem('forced-reload', JSON.stringify(new Date().getTime()));
            location.reload();
        }
    }
}
