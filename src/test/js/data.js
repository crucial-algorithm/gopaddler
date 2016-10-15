var pg = require('pg');
var Promise = require("bluebird");
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/paddler';


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

            var query = client.query("SELECT event_at, spm, speed, distance, spm_efficiency FROM session_data " +
                "WHERE session_id = $1 ORDER BY event_at", [id]);
            var rows = [];

            // Stream results back one row at a time
            query.on('row', function (row) {
                rows.push({
                    event_at: parseInt(row.event_at),
                    spm: parseInt(row.spm),
                    speed: parseFloat(row.speed),
                    distance: parseFloat(row.distance),
                    spm_efficiency: parseFloat(row.spm_efficiency)
                });
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