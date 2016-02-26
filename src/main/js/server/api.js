var Utils = require('../utils/utils.js');

var asteroid = new Asteroid("dev.gopaddler.com", true);

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

    // user is connected don't use local authentication
    if (Utils.isNetworkConnected()) {
        return defer.reject();
    }

    if (serializedUser) {

        user = JSON.parse(serializedUser);

        asteroid.loggedIn = true;
        asteroid.userId = user._id;
        asteroid.user = user;

        _finishLogin(defer, user);

    } else {

        defer.reject();
    }


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

        asteroid.loginWithFacebook().then(function () {

            // create a reactive query to fetch the user details (they're not provided by the loginWithFacebook method)
            asteroid.subscribe('currentUser');

            var users = asteroid.getCollection('users').reactiveQuery({_id: asteroid.userId});

            // the user information is immediately available
            if (users.result.length > 0) {
                _finishLogin(defer, users.result[0]);
                return;
            }

            // listen to changes in the user object
            users.on('change', function () {
                _finishLogin(defer, users.result[0]);
                users.off('change');
            });

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
    _storeUser(user);
    defer.resolve(user);
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
    }
};


/**
 * Training Session methods.
 */
exports.TrainingSessions = {

    save: function (trainingSession) {

        return _call('saveTrainingSession', trainingSession);
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