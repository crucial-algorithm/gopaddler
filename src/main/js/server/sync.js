'use strict';

var IO = require('../utils/io.js').IO;
var Utils = require('../utils/utils.js');
var Session = require('../model/session').Session;
var ScheduledSession = require('../model/scheduled-session').ScheduledSession;
var Api = require('../server/api');

var processing = {}, debugProcessing = {};

function sync() {
    if (document.PREVENT_SYNC === true) return;

    var isOffline = 'onLine' in navigator && !navigator.onLine;

    if (isOffline)
        return;

    Session.findAllNotSynced(function (sessions) {
        if (sessions.length === 0) {
            Utils.notify(Api.User.getProfile().name, " All sessions are already synced");
            return;
        }

        Utils.notify(Api.User.getProfile().name, " Found " + sessions.length + " sessions to sync");

        (function loop(sessions) {
            if (sessions.length === 0) return;

            var session = sessions.shift();

            // force processing one at the time and not to pick the same session twice
            if (processing[session.getId()]) {
                return;
            }

            processing[session.getId()] = true;
            uploadSession(session)
                .then(function () {
                    processing[session.getId()] = false;
                    loop(sessions);
                })
                .fail(function () {
                    processing[session.getId()] = false;
                    loop(sessions);
                });

        })(sessions);

    });
}


function uploadSession(localSession) {

    var defer = $.Deferred();

    // A synced session may reach this point if debug data wasn't yet uploaded... in that case,
    // upload debug data only (fire and forget - don't care if it fails)
    if (localSession.isSynced()) {
        Utils.notify(Api.User.getProfile().name, "Session "
            + moment(new Date(localSession.getSessionStart())).format() + " already synced - going for debug data");

        uploadDebugData(localSession);
        defer.resolve();
        return defer.promise();
    }

    Utils.notify(Api.User.getProfile().name, "Uploading session from "
        + moment(new Date(localSession.getSessionStart())).format() + "; Sc session #"
        + localSession.scheduledSessionId);

    localSession.createAPISession().then(function (trainingSession) {

        // don't upload empty sessions (not the best user experience, but let's keep it that way for now)!
        if (trainingSession.data.length === 0) {
            Session.synced(null, localSession.getId());
            Session.debugSyncFinished(localSession.getId(), true);
            defer.resolve();

            Utils.notify(Api.User.getProfile().name, " Session "
                + moment(new Date(localSession.getSessionStart())).format() + " is empty! Marking as synced");
            return defer.promise();
        }

        Utils.notify(Api.User.getProfile().name, " created API session for "
            + moment(new Date(localSession.getSessionStart())).format());

        Api.TrainingSessions.save(trainingSession).done(function (id) {

            Utils.notify(Api.User.getProfile().name, " Session "
                + moment(new Date(localSession.getSessionStart())).format() + " upload successfully; Remote #" + id);

            localSession.setRemoteId(id);
            Session.synced(localSession.getRemoteId(), localSession.getId());
            defer.resolve();

        })
            .fail(function (err) {
            Utils.notify(Api.User.getProfile().name, "Failed to upload session from "
                + moment(new Date(localSession.getSessionStart())).format() + " with error : " + err.message);
            defer.reject(err);
        });
    });

    return defer.promise();
}

function loadFile(filename) {
    var defer = $.Deferred();
    IO.open(filename).then(IO.read).then(function (csv) {
        defer.resolve(csv.split('\n'));
    });
    return defer.promise();
}

function uploadDebugData(session) {

    var self = this,
        sensorData = [],
        record,
        defer = $.Deferred(),
        isDebugEnabled = !!Api.User.getProfile().debug;

    if (debugProcessing[session.getId()]) {
        defer.resolve();
        return defer.promise();
    }

    if (!session.getDebugFile() || !isDebugEnabled) {
        Session.debugSyncFinished(session.getId(), true);
        defer.resolve();
        delete debugProcessing[session.getId()];
        return defer.promise();
    }

    if (!Utils.onWifi()) {
        defer.resolve();
        delete debugProcessing[session.getId()];
        return defer.promise();
    }

    Utils.notify(Api.User.getProfile().name, "Uploading debug session from "
        + moment(new Date(session.getSessionStart())).format());

    debugProcessing[session.getId()] = true;
    loadFile(session.getDebugFile()).then(function (rows) {

        var i = 0;

        if (session.getDbgSyncedRows() > 0) {
            i = session.getDbgSyncedRows() - 1;
        } else {
            // 1st time - register sync start
            Session.startDebugSync(session.getId(), sensorData.length);
        }

        for (var l = rows.length; i < l; i++) {
            if (!rows[0]) continue;

            record = rows[i].split(';');
            sensorData.push({
                timestamp: record[0],
                x: record[1],
                y: record[2],
                z: record[3],
                value: record[4]
            });
        }

        var SIZE = 1000;
        (function loopAsync() {
            var payload = sensorData.splice(0, SIZE);

            if (payload.length === 0) {
                Session.debugSyncFinished(session.getId(), true);
                delete debugProcessing[session.getId()];
                return;
            }

            Api.DebugSessions.save({trainingSession: session.getRemoteId(), data: payload}).done(function () {

                    Session.debugSynced(session.getId(), SIZE);

                    if (sensorData.length > 0) {
                        loopAsync();
                        return;
                    }

                    console.log('finish uploading session ' + session.getId());
                    Session.debugSyncFinished(session.getId(), true);
                    delete debugProcessing[session.getId()];
                    defer.resolve();
                })
                .fail(function (e) {

                    Utils.notify(Api.User.getProfile().name, "Error saving debug data from session from "
                        + moment(new Date(session.getSessionStart())).format() + " with error " + e.message);

                    delete debugProcessing[session.getId()];
                    
                    Session.get(session.getId()).then(function (s) {

                        if (s.getDebugAttempt() < 3) {
                            Session.incrementAttempt(session.getId()).then(function () {
                                loopAsync();
                            });
                            return;
                        }

                        Session.debugSyncFinished(session.getId(), false);
                        defer.reject(e);

                    }).fail(function () {

                        Session.debugSyncFinished(session.getId(), false);
                        defer.reject(e);
                    });
                });
        })();
    });
    return defer.promise();
}

function syncScheduledSessions () {
    if (document.PREVENT_SYNC === true) return;

    ScheduledSession.sync();
}

var syncStarted = false;
exports.start = function () {
    var self = this;
    if (syncStarted === true) {
        return;
    }
    setTimeout(function () {
        setInterval(sync.bind(self), 300000);
        setInterval(syncScheduledSessions.bind(self), 300000);
        syncScheduledSessions();
    }, 10000);
    syncStarted = true;
};
exports.uploadSession = uploadSession;
exports.uploadSessions = sync;
