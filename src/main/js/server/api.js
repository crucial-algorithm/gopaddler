var Utils = require('../utils/utils.js');
var createClass = require('asteroid').createClass;
var facebook = require('../asteroid/facebook');
var Asteroid = createClass([facebook]);
var connected = false, loggedIn = false, retries = 0;
var lastUserAddedMsg = null;
var onCoachRequest = function(){};

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

    if (lastUserAddedMsg) {
        asteroid.user.profile.liveUpdateEvery = lastUserAddedMsg.fields.profile.liveUpdateEvery;
        asteroid.user.profile.debug = lastUserAddedMsg.fields.profile.debug;
        asteroid.user.profile.boat = lastUserAddedMsg.fields.profile.boat;
    }

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

    if (_isFirstTime()) {
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

function _clearCoachRequests() {
    var serializedUser = localStorage.getItem('user');
    if (!serializedUser) {
        return;
    }

    var user = JSON.parse(serializedUser);
    user.pendingCoachRequests = [];
    _storeUser(user);
}

function _acceptCoachRequest() {
    var serializedUser = localStorage.getItem('user');
    if (!serializedUser) {
        return;
    }

    var user = JSON.parse(serializedUser);
    user.pendingCoachRequests = [];
    user.hasCoach = true;
    _storeUser(user);
}

/**
 *
 * @private
 */
function _call() {

    var defer = $.Deferred();

    if (!Utils.isNetworkConnected()) {
        setTimeout(function () {
            defer.reject({error: 504, reason: "no internet connection"});
        }, 0);
        return defer.promise();
    }

    if (asteroid.failedConnectAttempts > 0 && asteroid.lastFailedConnectionAttempt > 0 && asteroid.lastFailedConnectionAttempt - Date.now() < 60000) {
        setTimeout(function () {
            defer.reject({error: 502, reason: "connection to server failed"});
        }, 0);
        return defer.promise();
    }

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

function _callWithoutTimeout() {

    var defer = $.Deferred();

    if (!Utils.isNetworkConnected()) {
        setTimeout(function () {
            defer.reject({error: 504, reason: "no internet connection"});
        }, 0);
        return defer.promise();
    }

    asteroid.call.apply(asteroid, arguments).then(function (response) {

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

            var user;
            if (lastUserAddedMsg && id === lastUserAddedMsg.id) {
                user = {
                    "_id": id,
                    "profile": lastUserAddedMsg.fields.profile,
                    "services": lastUserAddedMsg.fields.services,
                    "emails": lastUserAddedMsg.fields.emails
                }
            } else {
                user = {
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
                };
            }

            _finishLogin(defer, user, 'password');
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

function _isFirstTime() {
    return localStorage.getItem("login_method") === null
}

function _setLoginMethod(method) {
    localStorage.setItem('login_method', JSON.stringify(method));
}

/**
 * Users methods.
 */
function isLiveUpdate() {
    return asteroid.user.profile.liveUpdateEvery > 0 && Utils.isNetworkConnected();
}
exports.User = {

    accessed: function() {
        var nbr = parseInt(localStorage.getItem('accesses'));
        if (isNaN(nbr)) {
            nbr = 1;
        } else {
            nbr++;
        }

        localStorage.setItem('accesses', nbr);
    },

    accesses: function() {
        var nbr = parseInt(localStorage.getItem('accesses'));
        if (isNaN(nbr)) {
            localStorage.setItem('accesses', "1");
            return 1;
        }
        return nbr;
    },

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

    hasChosenBoat: function () {
        return asteroid.user.profile.boat === 'K' || asteroid.user.profile.boat === "C"
    },

    saveDevice: function (device) {
        return _call('saveUserDevice', device);
    },

    saveBoat: function (choice) {
        asteroid.user.profile.boat = choice;
        return _call('saveUserBoat', choice);
    },

    saveMaxHeartRate: function (choice) {
        asteroid.user.profile.maxHeartRate = choice;
        return _call('saveMaxHeartRate', choice);
    },

    hasCoach: function () {
        return asteroid.user.hasCoach === true;
    },

    listCoaches: function () {
        return _call("listAthleteCoaches");
    },

    getCoachInfo: function(code) {
        return _call("getCoachInfo", code)
    },

    leaveCoachTeam: function(coachId) {
        return _call("leaveCoachTeam", coachId)
    },

    joinCoachTeam: function (code) {
        return _call("joinCoachTeam", code)
    },

    acceptRequest: function (coachUserId) {
        _acceptCoachRequest();
        return _call('respondToCoachRequest', coachUserId, true);
    },

    rejectRequest: function (requestId) {
        _clearCoachRequests();
        return _call('respondToCoachRequest', requestId, false);
    },

    isLiveUpdate: isLiveUpdate,

    listenForCoachRequests: function (callback) {
        if (asteroid.subscribe)  asteroid.subscribe('users.requests');
        if (typeof callback === 'function') {
            onCoachRequest = callback;
        }
    }
};

var liveListeners, commandListenerID, lastPingAt = null;

var resetListeners = function () {
    var syncClockListeners = (liveListeners || {}).syncClock ;
    liveListeners = {
        ping: [],
        start: [],
        pause: [],
        finish: [],
        startSplit: [],
        resumeSplits: [],
        pushExpression: [],
        syncClock: [],
        finishWarmup: []
    };

    if (syncClockListeners && syncClockListeners.length > 0) {
        liveListeners.syncClock = syncClockListeners;
    }
};

exports.LiveEvents = {
    PING: "ping",
    START: "start",
    PAUSE: "pause",
    FINISH: "finish",
    START_SPLIT: "startSplit",
    STOP_SPLIT: "stopSplit",
    RESUME_SPLITS: "resumeSplits",
    PUSH_EXPRESSION: "pushExpression",
    SYNC_CLOCK: "syncClock",
    CLOCK_SYNCED: 'clockSynced',
    FINISH_WARMUP: 'finishWarmup'
};

resetListeners();

/**
 * Training Session methods.
 */
exports.TrainingSessions = {

    save: function (trainingSession) {

        return _callWithoutTimeout('saveTrainingSession', trainingSession);
    },

    scheduled: function () {
        return _call('listScheduledSessions');
    },

    live: {

        checkApiVersion: function () {
            if (!isLiveUpdate()) {
                return reject();
            }
            return _call('checkApiVersion')
        },

        deviceReady: function () {
            if (!isLiveUpdate())
                return;

            _call('deviceReadyToStart');
        },

        deviceDisconnected: function () {
            if (!isLiveUpdate())
                return;

            _call('deviceDisconnected');
        },

        started: function (startedAt, expression) {
            if (!isLiveUpdate())
                return;

            _call('deviceStarted', startedAt, expression)
        },

        finishedWarmUp: function (duration, distance, isBasedInDistance) {
            if (!isLiveUpdate())
                return;

            _call('deviceFinishedWarmUp', duration, distance, isBasedInDistance)
        },


        finished: function (finishedAt) {
            if (!isLiveUpdate())
                return;

            _call('deviceFinished', finishedAt)
        },

        syncClock: function (id) {
            if (!isLiveUpdate())
                return;
            _call('syncDeviceClock', id)
        },

        /**
         *
         */
        splitChanged: function (from, to) {
            if (!isLiveUpdate())
                return;

            _call('splitChangedInLiveDevice', from, to)
        },

        update: function (data, status) {

            if (!isLiveUpdate())
                return;

            // Check if coach is watching
            if (lastPingAt !== null && new Date().getTime() - lastPingAt > 6 * 60 * 1000) {
                return;
            }

            _call('liveUpdate', [/* 0 = */ null
                , /*  1 = */ data.duration
                , /*  2 = */ data.speed
                , /*  3 = */ Utils.round(data.distance, 6)
                , /*  4 = */ data.spm
                , /*  5 = */ Utils.round2(data.efficiency)
                , /*  6 = */ null /* start, deprecated */
                , /*  7 = */ data.hr
                , /*  8 = */ data.split
                , /*  9 = */ data.locationTs === 0 ? 0 : Math.round(data.timestamp - data.locationTs) // send difference to save network bandwidth
                , /* 10 = */ data.locationChanged === true
                , /* 11 = */ data.locationAccuracy
            ], status);
        },

        commandSynced: function (id, type, payload) {
            if (!isLiveUpdate())
                return;

            _call('commandSyncedInDevice', id, type, payload)
        },

        startListening: function () {

            if (!isLiveUpdate())
                return;

            if (commandListenerID) return;
            var sub = asteroid.subscribe('coachRemoteCommands');
            commandListenerID = sub.id;

        },

        stopListening: function () {
            if (!isLiveUpdate())
                return;

            asteroid.unsubscribe(commandListenerID);
        },

        /**
         * Register callbacks for coach commands
         * @param event
         * @param callback
         * @param {Boolean} clear
         */
        on: function (event, callback, clear) {
            if (!isLiveUpdate())
                return;

            if (clear === true)
                liveListeners[event] = [];

            liveListeners[event].push(callback);
        },

        clearCommandListeners: function () {
            resetListeners()
        }
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
        console.debug('connect to server');

        if (!Utils.isNetworkConnected()) return;

        asteroid = new Asteroid({
            endpoint: __WS_ENDPOINT__
        });

        asteroid.on('connected', function () {
            connected = true;
            asteroid.failedConnectAttempts = 0;
            asteroid.lastFailedConnectionAttempt = null;
            console.debug('connection established');
        });

        asteroid.on('disconnected', function () {
            connected = false;
            if (asteroid.failedConnectAttempts === undefined) asteroid.failedConnectAttempts = 0;
            asteroid.failedConnectAttempts++;
            asteroid.lastFailedConnectionAttempt = Date.now();
            console.debug('connection failed', asteroid.failedConnectAttempts);
        });

        asteroid.on('loggedIn', function () {
            loggedIn = true;
        });

        asteroid.on('loggedOut', function () {
            loggedIn = false;
        });


        // listen for users
        asteroid.ddp.on("added", function (payload) {
            if (payload.collection !== 'users') {
                return;
            }

            lastUserAddedMsg = payload;
        });

        // listener for commands
        asteroid.ddp.on("added", function (msg) {
            if (msg.collection !== 'liveCommands')
                return;
            var record = msg.fields;
            var listeners = liveListeners[record.command] || [];

            for (var lst = 0, lstLen = listeners.length; lst < lstLen; lst++) {
                listeners[lst].apply({}, [msg.id, record.payload]);
            }
        });

        // listener for friends requests
        asteroid.ddp.on("added", function (msg) {
            if (msg.collection !== 'requests') {
                return;
            }

            var requesterId = msg.fields.requesterId;
            var requestId = msg.id;

            _call('getUserName', requesterId).then(function (name) {
                onCoachRequest({requestID: requestId, coach: name});
            });
        });

    }
};

function reject() {
    var defer = $.Deferred();
    defer.reject();
    return defer.promise();
}
