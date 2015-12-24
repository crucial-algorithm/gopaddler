'use strict';

var IO = require('../utils/io.js').IO;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;

var processing = {};

function sync() {
    if (document.PREVENT_SYNC === true) return;

    var isOffline = 'onLine' in navigator && !navigator.onLine;

    if (isOffline)
        return;

    Session.findAllNotSynced(function (sessions) {
        var trainingSession, row;
        for (var i = 0; i < sessions.length; i++) {
            if (processing[sessions[i].getId()] === true)
                continue;

            processing[sessions[i].getId()] = true;

            trainingSession = new Paddler.TrainingSession();
            trainingSession.setDate(new Date(sessions[i].getSessionStart()));
            trainingSession.setAngleZ(sessions[i].getAngleZ());
            trainingSession.setNoiseX(sessions[i].getNoiseX());
            trainingSession.setNoiseZ(sessions[i].getNoiseZ());
            trainingSession.setFactorX(sessions[i].getFactorX());
            trainingSession.setFactorZ(sessions[i].getFactorZ());
            trainingSession.setAxis(sessions[i].getAxis());

            SessionDetail.get(sessions[i].getId(), function (localSession, session) {
                return function (rows) {
                    var dataPoints = [];
                    for (var j = 0; j < rows.length; j++) {
                        row = new Paddler.TrainingSessionData();
                        row.setTimestamp(rows[j].getTimestamp());
                        row.setDistance(rows[j].getDistance());
                        row.setSpeed(rows[j].getSpeed());
                        row.setSpm(rows[j].getSpm());
                        row.setSpmEfficiency(rows[j].getEfficiency());
                        dataPoints.push(row);
                    }
                    session.setData(dataPoints);


                    Paddler.TrainingSessions.save(session).done(function (session) {

                            localSession.setRemoteId(session.getId());
                            Session.synced(localSession.getRemoteId(), localSession.getId());

                            IO.open(localSession.getDebugFile()).then(IO.read).then(function (csv) {
                                var rows = csv.split('\n');
                                uploadDebugData(localSession, rows).done(function () {
                                    delete processing[localSession.getId()];
                                });
                            });

                            if (!localSession.getDebugFile())
                                delete processing[localSession.getId()];
                        }
                    ).fail(function (res) {
                            console.log('save failed', res)
                            delete processing[localSession.getId()];
                        }).exception(function (res) {
                            delete processing[localSession.getId()];
                            console.log('save failed', res);
                        });
                }
            }(sessions[i], trainingSession));
        }
    });
}



function uploadDebugData(session, rows) {
    var self = this, sensorData = [], record, defer = $.Deferred();
    for (var i = 0, l = rows.length; i < l; i++) {
        record = rows[i].split(';');
        sensorData.push(new Paddler.DebugSessionData(/* ts = */ record[0]
            , /* x = */     record[1]
            , /* y = */     record[2]
            , /* z = */     record[3]
            , /* value = */ record[4]
        ));
    }

    Session.startDebugSync(session.getId(), sensorData.length);
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
    return defer.promise();
}

exports.start = function () {
    var self = this;
    setTimeout(function () {
        setInterval(sync.bind(self), 10000);
    }, 10000);
};
