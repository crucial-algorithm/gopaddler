'use strict'

function Session(page, db) {
    var self = this;
    var calibration =  Calibrate.load();

    var session = self.createSession(db, calibration);

    var gps = new GPS();

    document.PREVENT_SYNC = true;

    var sensorData = [];
    self.sensorDataFileError = false;

    IO.open(session.debug).then(function (file) {
        self.sensorDataFile = file;
    }).fail(function () {
            self.sensorDataFileError = true;
        });

    var strokeDetector = new StrokeDetector(session, calibration, null, function onAccelerationTriggered(acceleration, value) {
        if (self.sensorDataFileError == true) {
            // unbind listener
            strokeDetector.onAccelerationTriggeredListener(function(){});
            sensorData = [];
            return;
        }

        if (sensorData.length >= 100) {
            IO.write(self.sensorDataFile, sensorData.join('\n') + '\n');
            sensorData = [];
            return;
        }

        sensorData.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value].join(';'));
    });

    var $page = $(page);
    $page.off('appDestroy').on('appDestroy', function () {
        if (!timer) return;

        clearInterval(self.intervalId);

        timer.stop();
        gps.stop();
        strokeDetector.stop();

        // clean buffer
        IO.write(self.sensorDataFile, sensorData.join('\n'));

    });


    var timer = new Timer($('.yellow', page));
    timer.start();

    var speed = new Speed($('.blue', page), gps);
    speed.start();

    var distance = new Distance($('.red', page), gps);
    distance.start();


    var strokeRate = new StrokeRate($('.session-left', page), strokeDetector);
    strokeRate.onUpdate(function onSpmUpdate(spm) {

        new SessionDataEntity(db, session.id, new Date().getTime(), distance.getValue(), speed.getValue(), spm
            , 0 // TODO: implement efficiency
        ).save();

    });
    strokeRate.start();

    var back = function () {
        App.back('home');
    };

    $page.swipe({
        swipe: back
    });

    var tx = false;
    $page.on('appBeforeBack', function (e) {
        if (tx) {
            tx = false;
            return true;
        }
        confirm("Finish Session?", function (r) {
            if (r == 1) {
                tx = true;
                document.PREVENT_SYNC = false;
                session.finish();
                App.back('home');
            }
        });
        return false;
    });
}


Session.prototype.createSession = function (db, calibration) {
    var session = new SessionEntity(db
        , calibration.getAngleZ()
        , calibration.getNoiseX()
        , calibration.getNoiseZ()
        , calibration.getFactorX()
        , calibration.getFactorZ()
        , calibration.getPredominant() === 'X' ? 0 : 1
    );

    return session.create();
}


function SessionEntity(db, angleZ, noiseX, noiseZ, factorX, factorZ, axis) {
    this.db = db;
    this.id = null;
    this.sessionAt = new Date().getTime(); // TODO: handle timezone!!!
    this.angleZ = angleZ;
    this.noiseX = noiseX;
    this.noiseZ = noiseZ;
    this.factorX = factorX;
    this.factorZ = factorZ;
    this.axis = axis;
    this.debug = this.sessionAt + ".csv";
    return this;
}

SessionEntity.prototype.create = function () {
    var self = this;
    db.executeSql("INSERT INTO session (id, session_start, anglez, noisex, noisez, factorx, factorz, axis, debug) VALUES (?,?,?,?,?,?,?,?,?)",
        [this.id, this.sessionAt, this.angleZ, this.noiseX, this.noiseZ, this.factorX, this.factorZ, this.axis, this.debug], function (res) {
            console.log("Session #" + res.insertId + " created");
            self.id = res.insertId;
        }, function (error) {
            console.log('Error creating session: ' + error.message);
        });
    return this;
};

SessionEntity.prototype.finish = function () {
    var self = this;
    db.executeSql("select max(distance) total_distance, avg(speed) avg_speed, max(speed) max_speed, avg(spm) avg_sr, max(spm) top_sr " +
        "FROM session_data where session = ?", [self.id], function (res) {

        var record = res.rows.item(0);

        db.executeSql("update session set distance = ?, avg_sr = ?, top_sr = ?, avg_speed = ?, top_speed = ?, session_end = ? where id = ?"
            , [record.total_distance, record.avg_sr, record.top_sr, record.avg_speed, record.top_speed, new Date().getTime(), self.id])


    }, function (error) {
        console.log('Error creating session: ' + error.message);
    });
    return this;
};




SessionEntity.delete = function (id) {
    var defer = $.Deferred();
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM session_data where session = ?", [id], function () {
            tx.executeSql("DELETE FROM session where id = ?", [id], function s() {
                defer.resolve();
            }, function () {
                defer.fail();
            });

        }, function error() {
            defer.fail();
        });
    });
    return defer.promise();
};

SessionEntity.synced = function (id) {
    var defer = $.Deferred();
    db.executeSql("update session set synced = 1, synced_at = ? where id = ?", [new Date().getTime(), id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

SessionEntity.debugSynced = function (id, partially) {
    var defer = $.Deferred();
    db.executeSql("update session set debug_synced = 1, debug_synced_at = ?, debug_synced_part = ? where id = ?", [new Date().getTime(), id, partially === true ? 1 : 0], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

SessionEntity.sessionsSummary = function () {
    var defer = $.Deferred();
    db.executeSql("SELECT sum(distance) distance, max(top_speed) speed, sum(session_end - session_start) duration FROM session", [], function (res) {
        var record = res.rows.item(0);
        defer.resolve({
            distance: record.distance,
            speed: record.speed,
            duration: record.duration
        });
    }, function (error) {
        defer.fail(error);
    });
    return defer.promise();
}


SessionEntity.findAllNotSynced = function (callback) {
    db.executeSql("SELECT id, session_start, debug, anglez, noisex, noisez, factorx, factorz, axis FROM session WHERE synced <> 1", [], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

SessionEntity.all = function (callback) {
    db.executeSql("SELECT id, session_start, session_end, anglez, noisex, noisez, factorx, factorz, axis" +
        ", distance, avg_sr, top_sr, avg_speed, top_speed FROM session order by id desc", [], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

SessionEntity.last = function () {
    var defer = $.Deferred();
    db.executeSql("SELECT id, session_start, session_end, anglez, noisex, noisez, factorx, factorz, axis" +
        ", distance, avg_sr, top_sr, avg_speed, top_speed FROM session order by id desc limit 1", [], function (res) {

        if (res.rows.length > 0) {
            // TODO: create real entity
            defer.resolve(res.rows.item(0));
            return;
        }
        defer.resolve(undefined);
    }, function (error) {
        defer.reject(error.message);
    });

    return defer.promise();
};


function SessionDataEntity(db, session, timestamp, distance, speed, spm, efficiency) {
    this.db = db;
    this.session = session;
    this.timestamp = timestamp;
    this.distance = distance || 0;
    this.speed = speed || 0;
    this.spm = spm;
    this.efficiency = efficiency || 0;
}

SessionDataEntity.prototype.save = function () {
    db.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency) VALUES (?,?,?,?,?,?)",
        [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency], function (res) {
            console.log("Session Data#" + res.insertId + " created");
        }, function (error) {
            console.log('Error creating session: ' + error.message);
        });
}

SessionDataEntity.get = function(sessionId, callback) {
    db.executeSql("SELECT timestamp, distance, speed, spm, efficiency FROM session_data WHERE session = ?",[sessionId], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
}


