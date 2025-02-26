'use strict';


import HomeView from './views/home.view';
import SessionView from './views/session.view';
import SessionSummaryView from './views/session.summary';
import SettingsView from './views/settings.view';
import SessionsView from './views/sessions.view';
import CalibrationView from './views/calibration.view';
import CalibrationHelpView from './views/calibration.help.view';
import BluetoothView from './views/bluetooth.view';
import SelectSessionView from './views/select.session.view';
import ChooseBoatView from './views/choose.boat.view';
import DefineGPSSpeedView from './views/define.gps.update.rate.view';
import DefineHeartRateView from './views/define.heart.rate.view';
import DefineLanguageView from './views/define.language.view';
import ManageCoachView from './views/manage.coach.view';
import ChooseSportsView from './views/choose.sports.view';
import CoachSlaveView from './views/coach.slave.view';
import StravaView from './views/strava.view';
import CoachRedirectOnline from "./views/coach.redirect.online";
import Context from './context';
import {emulateCordova} from './global';
import Sync from './server/sync';
import Api from './server/api';
import Utils from './utils/utils';
import Analytics from './utils/analytics.js';
import Database  from './db.js';
import Settings from './model/settings';
import i18n from "./i18n/i18n";


let environment = undefined;

function pathFor(img) {
    if (environment !== 'dev') {
        return '../www/images/' + img;
    }
    return '/images/' + img;
}

import artTemplateRuntime from 'art-template/lib/runtime';
import ProfileView from "./views/profile.view";
import AppSettings from "./utils/app-settings";

artTemplateRuntime.translate = i18n.translate;
artTemplateRuntime.pathFor = pathFor;
artTemplateRuntime.isLandscapeMode = function () {
    console.log('global isLadscapeMode');
    let isLandscape = false;
    loadContext.then(function (context) {
        isLandscape = context.isPortraitMode() === false;
    });
    return isLandscape;
};

moment.locale(i18n.language());

// END handle i18 stuff -------


//hack: override App.load
let originalAppLoad = App.load.bind(App);
App.load = function (target) {
    if (target === App.current()) {
        console.debug('prevented duplicate navigation');
        return;
    }
    let args = Array.prototype.slice.call(arguments);
    originalAppLoad.apply(this, args);
};

let settings = undefined;
let loadContextDefer = $.Deferred();
let loadContext = loadContextDefer.promise();


function enrichPageArg(page, pageName) {
    let $page = $(page);
    let destroy = [], ready = [], androidBackButton = [];
    let appReady = false;
    let destroyed = false;

    $page.on('appShow', function() {
        Analytics.setView(pageName);
    });

    $page.off('appReady').on('appReady', function() {
        appReady = true;
        for (let i = 0; i < ready.length; i++) {
            ready[i].apply({}, [])
        }
    });

    $page.off('appDestroy').on('appDestroy', function() {
        if (destroyed === true) debugger;
        for (let i = 0; i < destroy.length; i++) {
            destroy[i].apply({}, [])
        }

        // clear page events
        $page.off();

        ready = [];
        destroy = [];
        destroyed = true;
    });

    $page.off('androidBackButton').on('androidBackButton', function () {
        for (let i = 0; i < androidBackButton.length; i++) {
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
            context = new Context(context.preferences(), environment, i18n.translate, i18n.language());
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

/**
 * Bluetooth devices paring
 */
App.controller('strava', function (page, request) {
    enrichPageArg(page, 'strava');
    loadContext.then(function (context) {
        new StravaView(page, context);
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
        new ManageCoachView(page, context, request);
    });
});

App.controller('choose-sport', function (page, request) {
    enrichPageArg(page, 'choose-sport');
    loadContext.then(function (context) {
        new ChooseSportsView(page, context);
    });
});

App.controller('redirect-coach', function (page, request) {
    enrichPageArg(page, 'redirect-coach');
    loadContext.then(function (context) {
        new CoachRedirectOnline(page, context);
    });
});

App.controller('coach-slave', function (page, request) {
    enrichPageArg(page, 'coach-slave');
    loadContext.then(function (context) {
        new CoachSlaveView(page, context);
    });
});

App.controller('profile', function (page) {
    enrichPageArg(page, 'profile');
    loadContext.then(function (context) {
        new ProfileView(page, context);
    });
});

function onDeviceReady() {
    document.getElementsByTagName('title')[0].innerText = AppSettings.applicationName();
    document.body.setAttribute('platform', device.platform.toLowerCase());

    document.pd_device_ready = true;
    let token = null;
    let universalLinkDefer = $.Deferred();
    window['universalLinks'].subscribe('ulJoinCoach', function (eventData) {

        const url = eventData.url || "";
        const parts = url.split("/");
        token = parts[parts.length - 1];
        universalLinkDefer.resolve(token);
    });

    Utils.mapBrowserToNative();

    loadDb().then(function () {
        loadUi(universalLinkDefer.promise());
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
    document.getElementsByTagName('title')[0].innerText = AppSettings.applicationName();
    // in browser (development mode!)
    emulateCordova();
    let universalLinkDefer = $.Deferred();
//    setTimeout(function () {universalLinkDefer.resolve(/* Token = */'nv69Mc4tTLnakQgjH');}, 1000);
    loadDb(true).then(() => {
        loadUi(universalLinkDefer.promise());
    })
}

function loadDb() {
    return Database.init();
}

function loadUi(universalLinkPromise = null) {
    Analytics.init();

    AppSettings.switch(() => {
        document.body.classList.add('gopaddler');
    }, () => {
        document.body.classList.add('utter-cycling');
        let head = document.getElementsByTagName('head')[0];
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'css/utter-cycling.css';
        link.media = 'all';
        head.appendChild(link);
    });

    // hack - for some reason, when not connected, screen orientation may not be properly set
    checkOrientationHack();

    Api.Server.connect();

    Settings.loadSettings().then(function (s) {
        settings = s;
        const context = new Context(settings, environment, i18n.translate, i18n.language());
        if (context.isPortraitMode()) {
            $('body').addClass('app-gp-portrait')
        }

        loadContextDefer.resolve(context);
    }).fail(function (error, defaultSettings) {
        settings = defaultSettings;
        loadContextDefer.resolve(new Context(settings, environment, i18n.translate, i18n.language()));
    });

    Api.Auth.login().done(function () {
        loadContext.then(function (context) {
            context.coachInviteTokenResolver = universalLinkPromise;
            context.navigate('home');
        });
    }).fail(function () {
        Api.Auth.createAccount().then(function () {
            loadContext.then(function (context) {
                context.coachInviteTokenResolver = universalLinkPromise;
                context.navigate('home');
            });
        });
    });
}


function checkOrientationHack() {
    if (!Utils.isNetworkConnected()) {

        let reloaded = JSON.parse(localStorage.getItem('forced-reload'));
        if ( !reloaded || (new Date().getTime() - reloaded) > 5000) {

            localStorage.setItem('forced-reload', JSON.stringify(new Date().getTime()));
            location.reload();
        }
    }
}

// add class when user selects an input
let $body = $('body');
$body.on('focus', 'input', function() {
    console.log('input focus detected');
    $('.app-page').addClass('keyboard-open');
});

$body.on('focusout', 'input', function() {
    console.log('input loose focus detected');
    $('.app-page').removeClass('keyboard-open');
});
