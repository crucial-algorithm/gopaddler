'use strict';


import HomeView from './views/home.view';
import SessionView from './views/session.view';
import SessionSummaryView from './views/session.summary';
import SettingsView from './views/settings.view';
import LoginView from './views/login.view';
import SessionsView from './views/sessions.view';
import CalibrationView from './views/calibration.view';
import CalibrationHelpView from './views/calibration.help.view';
import BluetoothView from './views/bluetooth.view';
import SessionTipsView from './views/session.tips.view';
import SelectSessionView from './views/select.session.view';
import LoginWithPasswordView from './views/login.with.password.view';
import ChooseBoatView from './views/choose.boat.view';
import DefineGPSSpeedView from './views/define.gps.update.rate.view';
import DefineHeartRateView from './views/define.heart.rate.view';
import DefineLanguageView from './views/define.language.view';
import ManageCoachView from './views/manage.coach.view';
import ChooseSportsView from './views/choose.sports.view';
import CoachSlaveView from './views/coach.slave.view';
import Context from './context';
import global from './global';
import Sync from './server/sync';
import Api from './server/api';
import Utils from './utils/utils';
import Analytics from './utils/analytics.js';


var LANGUAGE = localStorage.getItem('language') || 'en';

// Start handle i18 stuff -------
const PT = require('../../../res/i18n/pt');
const EN = require('../../../res/i18n/en');

const i18n = {
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
artTemplateRuntime.isLandscapeMode = function () {
    console.log('global isLadscapeMode');
    var isLandscape = false;
    loadContext.then(function (context) {
        isLandscape = context.isPortraitMode() === false;
    });
    return isLandscape;
};

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

const db = require('./db.js');
const Settings = require('./model/settings');

let settings = undefined;
let environment = undefined;
let loadContextDefer = $.Deferred();
let loadContext = loadContextDefer.promise();


function enrichPageArg(page, pageName) {
    var $page = $(page);
    var destroy = [], ready = [], androidBackButton = [];
    var appReady = false;
    var destroyed = false;

    $page.on('appShow', function() {
        Analytics.setView(pageName);
    });

    $page.off('appReady').on('appReady', function() {
        appReady = true;
        for (var i = 0; i < ready.length; i++) {
            ready[i].apply({}, [])
        }
    });

    $page.off('appDestroy').on('appDestroy', function() {
        if (destroyed === true) debugger;
        for (var i = 0; i < destroy.length; i++) {
            destroy[i].apply({}, [])
        }

        // clear page events
        $page.off();

        ready = [];
        destroy = [];
        destroyed = true;
    });

    $page.off('androidBackButton').on('androidBackButton', function () {
        for (var i = 0; i < androidBackButton.length; i++) {
            androidBackButton[i].apply({}, [])
        }
    });

    page.onReady = {
        then: function (callback) {
            ready.push(callback);
            if (appReady) {
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
    };

    page.onAndroidBackButton = {
        then: function (callback) {
            androidBackButton.push(callback)
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
        new LoginWithPasswordView(page, context);
    });
});

App.controller('home', function (page, request) {
    Analytics.setUser(Api.User.get());
    enrichPageArg(page, 'home');
    loadContext.then(function (context) {
        if (environment === 'prod')
            Sync.start(context);
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

App.controller('define-heart-rate', function (page, request) {
    enrichPageArg(page, 'define-heart-rate');
    loadContext.then(function (context) {
        new DefineHeartRateView(page, context);
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

App.controller('coach-slave', function (page, request) {
    enrichPageArg(page, 'coach-slave');
    loadContext.then(function (context) {
        new CoachSlaveView(page, context);
    });
});

function onDeviceReady() {
    document.pd_device_ready = true;

    Utils.mapBrowserToNative();

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

    Analytics.init();

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
    if (!Utils.isNetworkConnected()) {

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
