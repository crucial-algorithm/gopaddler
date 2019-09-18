'use strict';

import ScheduledSession from '../model/scheduled-session';
import Session from '../model/session';

const IO = require('../utils/io.js').IO;
const Utils = require('../utils/utils.js');
const Api = require('../server/api');

let processing = {}, debugProcessing = {};

function loadFile(filename) {
    var defer = $.Deferred();
    IO.open(filename).then(IO.read).then(function (csv) {
        defer.resolve(csv.split('\n'));
    });
    return defer.promise();
}

/**
 *
 * @param {Session} session
 * @return {*}
 */
function uploadDebugData(session) {
    const self = this;
    let sensorData = [],
        record,
        defer = $.Deferred(),
        isDebugEnabled = !!Api.User.getProfile().debug;

    if (debugProcessing[session.id]) {
        defer.resolve();
        return defer.promise();
    }

    if (!session.debugFile || !isDebugEnabled) {
        Session.debugSyncFinished(session.id, true);
        defer.resolve();
        delete debugProcessing[session.id];
        return defer.promise();
    }

    if (!Utils.onWifi()) {
        defer.resolve();
        delete debugProcessing[session.id];
        return defer.promise();
    }

    Utils.debug(Api.User.getProfile().name, "Uploading debug session from "
        + moment(new Date(session.sessionStart)).format());

    debugProcessing[session.id] = true;

    loadFile(session.debugFile).then(function (rows) {

        let i = 0;

        if (session.dbgSyncedRows > 0) {
            i = session.dbgSyncedRows - 1;
        } else {
            // 1st time - register sync start
            Session.startDebugSync(session.id, sensorData.length);
        }

        for (let l = rows.length; i < l; i++) {
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

        let SIZE = 1000;
        (function loopAsync() {
            let payload = sensorData.splice(0, SIZE);

            if (payload.length === 0) {
                Session.debugSyncFinished(session.id, true);
                delete debugProcessing[session.id];
                return;
            }

            Api.DebugSessions.save({trainingSession: session.remoteId, data: payload}).done(function () {

                    Session.debugSynced(session.id, SIZE);

                    if (sensorData.length > 0) {
                        loopAsync();
                        return;
                    }

                    console.log('finish uploading session ' + session.id);
                    Session.debugSyncFinished(session.id, true);
                    delete debugProcessing[session.id];
                    defer.resolve();
                })
                .fail(function (e) {

                    Utils.notify(Api.User.getProfile().name, "Error saving debug data from session from "
                        + moment(new Date(session.sessionStart)).format() + " with error " + e.message);

                    delete debugProcessing[session.id];
                    
                    Session.get(session.id).then(function (s) {

                        if (s.debugAttempt < 3) {
                            Session.incrementAttempt(session.id).then(function () {
                                loopAsync();
                            });
                            return;
                        }

                        Session.debugSyncFinished(session.id, false);
                        defer.reject(e);

                    }).fail(function () {

                        Session.debugSyncFinished(session.id, false);
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

let syncStarted = false;

class Sync {

    static start() {
        const self = this;
        if (syncStarted === true) {
            return;
        }
        setTimeout(function () {
            setInterval(sync.bind(self), 300000);
            setInterval(syncScheduledSessions.bind(self), 300000);
            syncScheduledSessions();
        }, 10000);
        syncStarted = true;
    }

    /**
     *
     * @param {Session} session
     * @return {*}
     */
    static uploadSession(session) {

        let defer = $.Deferred();

        // A synced session may reach this point if debug data wasn't yet uploaded... in that case,
        // upload debug data only (fire and forget - don't care if it fails)
        if (session.synced && !Api.User.isAppTester()) {
            Utils.debug(Api.User.getProfile().name, "Session "
                + moment(new Date(session.sessionStart)).format() + " already synced - going for debug data");

            uploadDebugData(session);
            defer.resolve();
            return defer.promise();
        }

        Utils.debug(Api.User.getProfile().name, "Uploading session from "
            + moment(new Date(session.sessionStart)).format() + "; Sc session #"
            + session.scheduledSessionId);

        session.createAPISession().then(function (trainingSession) {

            // don't upload empty sessions (not the best user experience, but let's keep it that way for now)!
            if (trainingSession.data.length === 0) {
                Session.synced(null, session.id);
                Session.debugSyncFinished(session.id, true);
                defer.resolve();

                Utils.debug(Api.User.getProfile().name, " Session "
                    + moment(new Date(session.sessionStart)).format() + " is empty! Marking as synced");
                return defer.promise();
            }

            Api.TrainingSessions.save(trainingSession).done(function (id) {

                Utils.debug(Api.User.getProfile().name, " Session "
                    + moment(new Date(session.sessionStart)).format() + " upload successfully; Remote #" + id);

                session.remoteId = id;
                Session.synced(session.remoteId, session.id);
                defer.resolve();

            })
                .fail(function (err) {
                    Utils.notify(Api.User.getProfile().name, "Failed to upload session from "
                        + moment(new Date(session.sessionStart)).format() + " with error : " + err.message);
                    defer.reject(err);
                });
        });

        return defer.promise();
    }

    static uploadSessions() {
        if (document.PREVENT_SYNC === true) return;

        let isOffline = 'onLine' in navigator && !navigator.onLine;

        if (isOffline)
            return;

        Session.findAllNotSynced(function (/**@type Session[] */ sessions) {
            if (sessions.length === 0) {
                Utils.debug(Api.User.getProfile().name, " All sessions are already synced");
                return;
            }

            Utils.debug(Api.User.getProfile().name, " Found " + sessions.length + " sessions to sync");

            (function loop(sessions) {
                if (sessions.length === 0) return;

                /**@type Session */
                let session = sessions.shift();

                // force processing one at the time and not to pick the same session twice
                if (processing[session.id]) {
                    return;
                }

                processing[session.id] = true;
                Sync.uploadSession(session)
                    .then(function () {
                        processing[session.id] = false;
                        loop(sessions);
                    })
                    .fail(function () {
                        processing[session.id] = false;
                        loop(sessions);
                    });

            })(sessions);

        });
    }
}

export default Sync;
