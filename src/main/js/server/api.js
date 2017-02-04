var Utils = require('../utils/utils.js');
var lastEvent = undefined, retries = 0;

//var asteroid = new Asteroid("local.gopaddler.com:3000", false, function(data) {
//    lastEvent = data;
//});

var asteroid = new Asteroid("app.gopaddler.com", true, function intercept (data) {
     lastEvent = data;
});

var serverAvailable = function (d) {
    var defer = d || $.Deferred();

    if (retries >= 3) {
        defer.reject();
        return;
    }

    // If no network, server is for sure not available
    if (!Utils.isNetworkConnected()) {
        return defer.reject();
    }

    if (lastEvent === undefined) {
        retries++;
        setTimeout(function () {
            serverAvailable(defer);
        }, 1000);
    } else {

        if (lastEvent && (lastEvent.type === "socket_close"
            || lastEvent.type === "socket_error")) {
            defer.reject();
        } else {
            defer.resolve();
        }
    }
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

    serverAvailable().done(function serverIsAvailable() {
        defer.reject();

    }).fail(function serverNotAvailable() {

            if (serializedUser) {

                user = JSON.parse(serializedUser);

                asteroid.loggedIn = true;
                asteroid.userId = user._id;
                asteroid.user = user;

                _finishLogin(defer, user);

            } else {

                defer.reject();
            }
    });

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

    if (Utils.isNetworkConnected()) {

        asteroid.loginWithFacebook().then(function (user) {

            _finishLogin(defer, user);

        }).catch(function (err) {

            defer.reject(err);
        });

    } else {

        defer.reject('No network');
    }

    return defer.promise();
}


/**
 *
 * @param defer
 * @param user
 *
 * @private
 */
function _finishLogin(defer, user) {
    _call('hasCoach').then(function (value) {
        user.hasCoach = value;
    }).fail(function (err) {
        console.log(err);
    }).always(function () {
        _storeUser(user);
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

    asteroid.call.apply(asteroid, arguments).result.then(function (response) {

        defer.resolve(response);

    }).catch(function (err) {

        defer.reject(err);
    });

    return defer.promise();
}


/**
 * Authentication methods.
 */
exports.Auth = {

    login: function () {

        var defer = $.Deferred();

        _localLogin().done(function (user) {

            defer.resolve(user);

            // even if the local authentication succeeds go ahead and try to login remotely
            _remoteLogin();

        }).fail(function () {

            // local login failed, let's try the remote login
            _remoteLogin().done(defer.resolve).fail(defer.reject);
        });

        return defer.promise();
    },


    logout: function () {

        var defer = $.Deferred();

        asteroid.logout().then(function () {

            // remove from local storage
            localStorage.removeItem('user');

            // set values to undefined
            asteroid.user = undefined;

            defer.resolve();

        }).catch(function (err) {

            defer.reject(err);
        });


        return defer.promise();
    }
};


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