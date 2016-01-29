'use strict';

var IO = require('../utils/io.js').IO;
var Utils = require('../utils/utils.js');
var Session = require('../model/session').Session;

var processing = {};

function sync() {
    if (document.PREVENT_SYNC === true) return;

    if (!Utils.onWifi()) {
        return;
    }

    var isOffline = 'onLine' in navigator && !navigator.onLine;

    if (isOffline)
        return;

    Session.findAllNotSynced(function (sessions) {
        for (var i = 0; i < sessions.length; i++) {
            if (processing[sessions[i].getId()] === true)
                continue;

            // set lock
            processing[sessions[i].getId()] = true;
            
            if (sessions[i].isSynced()) {
                uploadDebugData(sessions[i]);
            } else {
                uploadSession(sessions[i]);
            }
        }
    });
}


function uploadSession(localSession) {
    var defer = $.Deferred();

    localSession.createAPISession().then(function (api) {
        Paddler.TrainingSessions.save(api).done(function (remoteSession) {

                localSession.setRemoteId(remoteSession.getId());
                Session.synced(localSession.getRemoteId(), localSession.getId());

                // upload debug data, if we have a file
                uploadDebugData(localSession);
            }
        ).fail(function (res) {
                console.log('save failed', res);
                delete processing[localSession.getId()];
            }).exception(function (res) {
                delete processing[localSession.getId()];
                console.log('save failed', res);
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

    var self = this
        , sensorData = []
        , record
        , defer = $.Deferred();

    if (!session.getDebugFile()) {
        delete processing[session.getId()];
        defer.resolve();
        return defer.promise();
    }


    loadFile(session.getDebugFile()).then(function (rows) {

        var i = 0;
        if (session.getDbgSyncedRows() > 0) {
            i = session.getDbgSyncedRows() - 1;
        } else {
            // 1st time - register sync start
            Session.startDebugSync(session.getId(), sensorData.length);
        }

        for (var l = rows.length; i < l; i++) {
            record = rows[i].split(';');
            sensorData.push(new Paddler.DebugSessionData(/* ts = */ record[0]
                , /* x = */     record[1]
                , /* y = */     record[2]
                , /* z = */     record[3]
                , /* value = */ record[4]
            ));
        }

        var SIZE = 1000;
        (function loopAsync() {
            var payload = sensorData.splice(0, SIZE);

            Paddler.DebugSessions.saveMultiple(session.getRemoteId(), payload)
                .then(function () {
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

                    console.log('error saving debug data: ', e);

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

exports.start = function () {
    var self = this;
    setTimeout(function () {
        setInterval(sync.bind(self), 60000);
    }, 10000);
};
