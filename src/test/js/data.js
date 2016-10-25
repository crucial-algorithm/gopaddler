var pg = require('pg');
var Promise = require("bluebird");
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/paddler';
var SessionDetail = require('../../main/js/model/session-detail').SessionDetail;


exports.get = function (id) {
    return new Promise(function (resolve) {

        // Get a Postgres client from the connection pool
        pg.connect(connectionString, function (err, client, done) {

            var query = client.query("select * from unit_test_detail where unit_test_id = $1 order by timestamp", [id]);
            var rows = [];

            // Stream results back one row at a time
            query.on('row', function (row) {
                rows.push({
                    timestamp: parseFloat(row.timestamp),
                    x: row.x,
                    y: row.y,
                    z: row.z,
                    acceleration: parseFloat(row.acceleration)
                });
            });

            // After all data is returned, close connection and return results
            query.on('end', function () {
                client.end();
                resolve(rows);
            });

            // Handle Errors
            if (err) {
                console.log(err);
            }
        });
    })
};


exports.getSessionData = function (id) {
    return new Promise(function (resolve) {

        // Get a Postgres client from the connection pool
        pg.connect(connectionString, function (err, client, done) {

            var query = client.query("SELECT event_at, spm, speed, distance, spm_efficiency, 0 latitude, 0 longitude " +
                " FROM session_data WHERE session_id = $1 ORDER BY event_at", [id]);
            var rows = [];

            // Stream results back one row at a time
            query.on('row', function (row) {
                rows.push(new SessionDetail(id, parseFloat(row.event_at), parseFloat(row.distance)
                    , parseFloat(row.speed), parseFloat(row.spm), parseFloat(row.spm_efficiency)
                    , row.latitude, row.longitude));
            });

            // After all data is returned, close connection and return results
            query.on('end', function () {
                client.end();
                resolve(rows);
            });

            query.on('error', function (err) {
                console.log(err);
            });

            // Handle Errors
            if (err) {
                console.log(err);
            }
        });
    })



};