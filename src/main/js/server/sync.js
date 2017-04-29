'use strict';

var IO = require('../utils/io.js').IO;
var Utils = require('../utils/utils.js');
var Session = require('../model/session').Session;
var ScheduledSession = require('../model/scheduled-session').ScheduledSession;
var Api = require('../server/api');

var processing = {};

function sync() {
    if (document.PREVENT_SYNC === true) return;

    var isOffline = 'onLine' in navigator && !navigator.onLine;

    if (isOffline)
        return;

    Session.findAllNotSynced(function (sessions) {
        if (sessions.length > 0)
            Utils.notify(Api.User.getProfile().name, " Found " + sessions.length + " sessions to sync");
        else
            Utils.notify(Api.User.getProfile().name, " All sessions are already synced");

        (function loop(sessions) {
            var session = sessions.shift();

            uploadSession(session)
                .then(function () {
                    if (sessions.length > 0)
                        loop(sessions);
                })
                .fail(function () {
                    if (sessions.length > 0)
                        loop(sessions);
                });

        })(sessions);

    });
}


function uploadSession(localSession) {

    var defer = $.Deferred();

    Utils.notify(Api.User.getProfile().name, "Uploading session from "
        + moment(new Date(localSession.getSessionStart())).format() + "; Sc session #"
        + localSession.scheduledSessionId);

    localSession.createAPISession().then(function (trainingSession) {

        Utils.notify(Api.User.getProfile().name, " created API session for "
            + moment(new Date(localSession.getSessionStart())).format());
        Api.TrainingSessions.save(trainingSession).done(function (id) {

            Utils.notify(Api.User.getProfile().name, " Session "
                + moment(new Date(localSession.getSessionStart())).format() + " upload successfully; Remote #" + id);

            localSession.setRemoteId(id);

            Session.synced(localSession.getRemoteId(), localSession.getId());

            // upload debug data, if we have a file
            if (trainingSession.data.length === 0) {
                Session.debugSyncFinished(localSession.getId(), true);
                delete processing[localSession.getId()];
            } else {
                uploadDebugData(localSession);
            }

            defer.resolve();

        })
            .fail(function (err) {
            Utils.notify(Api.User.getProfile().name, "Failed to upload session from "
                + moment(new Date(localSession.getSessionStart())).format() + " with error : " + err.message);

            delete processing[localSession.getId()];
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

    if (!session.getDebugFile()) {
        delete processing[session.getId()];
        defer.resolve();
        return defer.promise();
    }

    if (!isDebugEnabled) {
        delete processing[session.getId()];
        defer.resolve();
        return defer.promise();
    }

    if (!Utils.onWifi()) {
        delete processing[session.getId()];
        defer.resolve();
        return defer.promise();
    }

    Utils.notify(Api.User.getProfile().name, "Uploading debug session from "
        + moment(new Date(session.getSessionStart())).format());


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
                    defer.resolve();
                })
                .fail(function (e) {

                    Utils.notify(Api.User.getProfile().name, "Error saving debug data from session from "
                        + moment(new Date(session.getSessionStart())).format() + " with error " + e.message);

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

exports.start = function () {
    var self = this;
    setTimeout(function () {
        setInterval(sync.bind(self), 300000);
        syncScheduledSessions();
        setInterval(function () {
            syncScheduledSessions();
        }, 300000);
    }, 10000);
};

exports.uploadSession = uploadSession;
exports.uploadSessions = sync;
