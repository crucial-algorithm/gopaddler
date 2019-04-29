'use strict';

var LANGUAGE = localStorage.getItem('language') || 'en';

// Start handle i18 stuff -------
var PT = require('../../../res/i18n/pt');
var EN = require('../../../res/i18n/en');

var i18n = {
    en: EN,
    pt: PT
};

function translate(key, placeholders) {
    var text = i18n[LANGUAGE].translations[key] || "";
    placeholders = placeholders || [];
    var i = 1;
    for (var p = 0, l = placeholders.length; p < l; p++) {
        var placeholder = placeholders[p];
        text = text.replace(new RegExp("\\$" + i, "g"), placeholder);
        i++;
    }
    return text;
}

var artTemplateRuntime = require('art-template/lib/runtime');
artTemplateRuntime.translate = translate;

moment.locale(LANGUAGE);

// END handle i18 stuff -------


//hack: override App.load
var originalAppLoad = App.load.bind(App);
App.load = function (target) {
    if (target === App.current()) {
        console.debug('prevented duplicate navigation');
        return;
    }
    var args = Array.prototype.slice.call(arguments);
    originalAppLoad.apply(this, args);
};

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
var DefineLanguageView = require('./views/define.language.view').DefineLanguageView;
var ManageCoachView = require('./views/manage.coach.view').ManageCoachView;
var ChooseSportsView = require('./views/choose.sports.view').ChooseSportsView;
var Api = require('./server/api');
var utils = require('./utils/utils.js');
var global = require('./global.js');
var db = require('./db.js');
var sync = require('./server/sync.js');
var analytics = require('./utils/analytics.js');
var Settings = require('./model/settings');
var Context = require('./context').Context;

var settings = undefined;
var environment = undefined;
var loadContextDefer = $.Deferred();
var loadContext = loadContextDefer.promise();


function enrichPageArg(page, pageName) {
    var $page = $(page);
    var callbacks = [], destroy = [];
    var appShown = false;

    $page.off('appShow').on('appShow', function() {
        appShown = true;
        analytics.setView(pageName);
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i].apply({}, [])
        }
    });

    $page.off('appDestroy').on('appDestroy', function() {
        for (var i = 0; i < destroy.length; i++) {
            destroy[i].apply({}, [])
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

    page.onDestroy = {
        then: function (callback) {
            destroy.push(callback);
        }
    }
}

/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {
    enrichPageArg(page, 'login');
    loadContext.then(function (context) {
        new LoginView(page, context);
    });
});

App.controller('login-with-password', function (page) {
    enrichPageArg(page, 'login-with-password');
    loadContext.then(function (context) {
        new LoginWithPassword(page, context);
    });
});

App.controller('home', function (page, request) {
    analytics.setUser(Api.User.get());
    enrichPageArg(page, 'home');
    loadContext.then(function (context) {
        if (environment === 'prod')
            sync.start(context);
        new HomeView(page, context, request);
    });
});

/**
 * New session page.
 */
App.controller('session', function (page, scheduledSession) {
    enrichPageArg(page, 'session');
    loadContext.then(function (context) {
        new SessionView(page, context, scheduledSession);
    });
});

App.controller('session-summary', function (page, session) {
    enrichPageArg(page, 'session-summary');
    loadContext.then(function (context) {
        new SessionSummaryView(page, context, session);
    });
});

/**
 * Settings page.
 */
App.controller('settings', function (page) {
    enrichPageArg(page, 'settings');
    loadContext.then(function (context) {
        new SettingsView(page, context, settings);
        page.onDestroy.then(function () {
            loadContextDefer = $.Deferred();
            loadContext = loadContextDefer.promise();
            context = new Context(context.preferences(), environment, translate, LANGUAGE);
            loadContextDefer.resolve(context);
            new SessionsView(page, context);
        });
    });
});

/**
 * Session list page.
 */
App.controller('sessions', function (page) {
    enrichPageArg(page, 'sessions');
    loadContext.then(function (context) {
        new SessionsView(page, context);
    });
});

/**
 * Calibration page.
 */
App.controller('calibration', function (page, request) {
    enrichPageArg(page, 'calibration');
    loadContext.then(function (context) {
        new CalibrationView(page, context, request);
    });
});

/**
 * Pause and swipe session tutorial page.
 */
App.controller('session-basic-touch-tutorial', function (page) {
    enrichPageArg(page, 'session-touch-tips-tutorial');
    loadContext.then(function (context) {
        new SessionTipsView(page, context);
    });
});

/**
 * Calibration tutorial
 */
App.controller('calibration-help', function (page, request) {
    enrichPageArg(page, 'calibration-help');
    loadContext.then(function (context) {
        new CalibrationHelpView(page, context, request);
    });
});

/**
 * Bluetooth devices paring
 */
App.controller('bluetooth', function (page, request) {
    enrichPageArg(page, 'bluetooth');
    loadContext.then(function (context) {
        new BluetoothView(page, context, request);
    });
});

App.controller('select-session', function (page, request) {
    enrichPageArg(page, 'select-session');
    loadContext.then(function (context) {
        new SelectSessionView(page, context, request);
    });
});

App.controller('choose-boat', function (page, request) {
    enrichPageArg(page, 'choose-boat');
    loadContext.then(function (context) {
        new ChooseBoatView(page, context);
    });
});

App.controller('define-gps-update-rate', function (page, request) {
    enrichPageArg(page, 'define-gps-update-rate');
    loadContext.then(function (context) {
        new DefineGPSSpeedView(page, context);
    });
});

App.controller('define-max-heart-rate', function (page, request) {
    enrichPageArg(page, 'define-max-heart-rate');
    loadContext.then(function (context) {
        new DefineMaxHeartRateView(page, context);
    });
});

App.controller('define-language', function (page, request) {
    enrichPageArg(page, 'define-language');
    loadContext.then(function (context) {
        new DefineLanguageView(page, context);
    });
});

App.controller('manage-coach', function (page, request) {
    enrichPageArg(page, 'manage-coach');
    loadContext.then(function (context) {
        new ManageCoachView(page, context);
    });
});

App.controller('choose-sport', function (page, request) {
    enrichPageArg(page, 'choose-sport');
    loadContext.then(function (context) {
        new ChooseSportsView(page, context);
    });
});

function onDeviceReady() {
    document.pd_device_ready = true;

    utils.mapBrowserToNative();

    loadDb().then(function () {
        loadUi();
    });
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
    return db.init();
}

function loadUi() {

    analytics.init();

    // hack - for some reason, when not connected, screen orientation may not be properly set
    checkOrientationHack();

    Api.Server.connect();

    Settings.loadSettings().then(function (s) {
        settings = s;
        loadContextDefer.resolve(new Context(settings, environment, translate, LANGUAGE));
    }).fail(function (error, defaultSettings) {
        settings = defaultSettings;
        loadContextDefer.resolve(new Context(settings, environment, translate, LANGUAGE));
    });


    Api.Auth.login().done(function () {
        loadContext.then(function (context) {
            context.navigate('home');
        });
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

// add class when user selects an input
var $body = $('body');
$body.on('focus', 'input', function() {
    console.log('input focus detected');
    $('.app-page').addClass('keyboard-open');
});

$body.on('focusout', 'input', function() {
    console.log('input loose focus detected');
    $('.app-page').removeClass('keyboard-open');
});
