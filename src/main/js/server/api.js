var Utils = require('../utils/utils.js');
var createClass = require('asteroid').createClass;
var facebook = require('../asteroid/facebook');
var Asteroid = createClass([facebook]);
var connected = false, loggedIn = false, retries = 0;

var asteroid = {};


var serverAvailable = function (d) {
    var defer = d || $.Deferred();

    if (retries >= 3) {
        defer.reject();
        return defer.promise();
    }

    // If no network, server is for sure not available
    if (!Utils.isNetworkConnected()) {
        return defer.reject();
    }

    if (connected) {
        return defer.resolve();
    }

    retries++;
    setTimeout(function () {
        serverAvailable(defer);
    }, 1000);

    return defer.promise();
};

/**
 * Load user information from local storage.
 *
 * @returns {*}
 *
 * @private
 */
function _localLogin() {

    var defer = $.Deferred(),
        serializedUser = localStorage.getItem('user'),
        user;

    if (!serializedUser) {
        defer.reject();
        return defer.promise();
    }

    user = JSON.parse(serializedUser);

    asteroid.loggedIn = true;
    asteroid.userId = user._id;
    asteroid.user = user;

    _finishLogin(defer, user);

    return defer.promise();
}


/**
 * Authenticate the user remotely.
 *
 * @returns {*}
 *
 * @private
 */
function _remoteLogin() {

    var defer = $.Deferred();

    if (!Utils.isNetworkConnected()) {
        defer.reject();
        return defer.promise();
    }

    if (_getLoginMethod() === 'password') {
        checkLoginStatus().then(function () {
            _localLogin().then(defer.resolve).fail(defer.reject);
        }).fail(function (err) {
            defer.reject(err);
        });
        return defer.promise();
    }

    // facebook login
    _loginWithFacebook().then(defer.resolve).fail(defer.reject);

    return defer.promise();
}

function _loginWithFacebook() {
    var defer = $.Deferred();
    try {
        asteroid.loginWithFacebook().then(function (user) {
            _finishLogin(defer, user, 'facebook');

        }).fail(function (err) {
            defer.reject(err);
        });
    } catch (err) {
        defer.reject();
    }

    return defer.promise();
}

function checkLoginStatus() {
    return _call('loginStatus')
}

/**
 *
 * @param defer
 * @param user
 * @param method Login method: password or facebook
 *
 * @private
 */
function _finishLogin(defer, user, method) {

    if (!Utils.isNetworkConnected()) {
        defer.resolve(user);
        return;
    }

    _storeUser(user);
    if (method)
        _setLoginMethod(method);

    if (!loggedIn) {
        defer.resolve(user);
        return;
    }

    _call('hasCoach').then(function (value) {
        user.hasCoach = value;
        _storeUser(user);
    }).fail(function (err) {
        console.log(err);
        defer.resolve(user);
    }).always(function () {
        defer.resolve(user);
    });
}


/**
 * Register the user for this session and persist it in the local storage.
 *
 * @param user
 *
 * @private
 */
function _storeUser(user) {
    asteroid.user = user;
    localStorage.setItem('user', JSON.stringify(user));
}


/**
 *
 * @private
 */
function _call() {

    var defer = $.Deferred();

    asteroid.call.apply(asteroid, arguments).then(function (response) {

        defer.resolve(response);

    }).catch(function (err) {

        defer.reject(err);
    });

    setTimeout(function () {
        if (defer.state() === 'pending') {
            defer.reject({error: 408, reason: "timeout"});
        }
    }, 30000);

    return defer.promise();
}

/**
 * Authentication methods.
 */
exports.Auth = {

    login: function () {

        var defer = $.Deferred();

        serverAvailable().done(function serverIsAvailable() {

            _remoteLogin().done(defer.resolve).fail(defer.reject);

        }).fail(function () {
            _localLogin().done(defer.resolve).fail(defer.reject);

        });

        return defer.promise();
    },

    loginWithFacebook: _loginWithFacebook,

    loginWithPassword: function (email, password) {
        var defer = $.Deferred();

        if (!Utils.isNetworkConnected()) {
            defer.reject();
            return defer.promise();
        }

        asteroid.loginWithPassword({email: email, password: password}).then(function (id) {
            _finishLogin(defer, {
                "_id": id,
                "profile": {
                    "name": null,
                    "avatar": null,
                    "email": email,
                    "country": null,
                    "gender": null,
                    "birthdate": null,
                    "about": null,
                    "debug": false,
                    "device": null
                },
                "services": null
            }, 'password');
        }).catch(function (err) {
            defer.reject(err);
        });

        return defer.promise();
        
    },


    logout: function () {

        var defer = $.Deferred();

        asteroid.logout().then(function () {

            // remove from local storage
            localStorage.removeItem('user');
            localStorage.removeItem('login_method');

            // set values to undefined
            asteroid.user = undefined;

            defer.resolve();

        }).catch(function (err) {

            defer.reject(err);
        });


        return defer.promise();
    },

    createAccount: function (email, password, name) {
        return _call("gpCreateUser", {
            email: email,
            password: password,
            profile: {
                name: name
            }
        })
    },

    forgotPassword: function (email) {
        return _call("gpRecoverPassword", {
            email: email
        })
    }
};


function _getLoginMethod() {
    return JSON.parse(localStorage.getItem("login_method")) === 'password' ? 'password' : 'facebook';
}

function _setLoginMethod(method) {
    localStorage.setItem('login_method', JSON.stringify(method));
}


/**
 * Users methods.
 */
exports.User = {


    set: function (user) {
        asteroid.user = user;
        asteroid.userId = user._id;
    },


    get: function () {
        return asteroid.user;
    },


    getId: function () {
        return asteroid.userId;
    },


    getProfile: function () {
        return asteroid.user.profile;
    },


    saveDevice: function (device) {
        return _call('saveUserDevice', device);
    },

    hasCoach: function () {
        return asteroid.user.hasCoach === true;
    }
};


/**
 * Training Session methods.
 */
exports.TrainingSessions = {

    save: function (trainingSession) {

        return _call('saveTrainingSession', trainingSession);
    },

    scheduled: function () {
        return _call('listScheduledSessions');
    }
};


/**
 * Debug Session methods.
 */
exports.DebugSessions = {

    save: function (debugSession) {

        return _call('saveTrainingSessionDebug', debugSession);
    }
};


exports.Server = {

    connect: function () {

        if (!Utils.isNetworkConnected()) return;

        asteroid = new Asteroid({
            endpoint: __WS_ENDPOINT__
        });


        asteroid.on('connected', function () {
            connected = true;
        });

        asteroid.on('disconnected', function () {
            connected = false;
        });

        asteroid.on('loggedIn', function () {
            loggedIn = true;
        });

        asteroid.on('loggedOut', function () {
            loggedIn = false;
        });
    }
};