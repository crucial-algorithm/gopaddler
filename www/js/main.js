var db;

/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {

    var $login = $('#facebook', page);

    $login.on('touchstart', function () {

        FB.login().done(function () {

            // successful login navigates to home page
            App.load('home');

        }).fail(function (err) {

            if (err && err.message) {

                // show error message
                alert(err.message);
            }
        });
    });
});


App.controller('home', function (page) {

    $('#btn-sessions', page).on('touchend', function () {
        App.load('sessions');
    });

    $('#btn-session', page).on('touchend', function () {
        var calibration = Calibrate.load();
        if (calibration === undefined) {
            alert("No calibration: Got to Settings > Calibrate");
            return;
        }
        App.load('session');
    });

    $('#btn-settings', page).on('touchend', function () {
        App.load('settings');
    });

    $('.home-username', page).html('Hi, ' + Paddler.Session.getUser().getFullName());
});


/**
 * New session page.
 */
App.controller('session', function (page) {
    new Session(page, db);
});


/**
 * Settings page.
 */
App.controller('settings', function (page) {

    var $calibration = $('#calibration', page),
        $back = $('.back-button', page);

    $calibration.on('touchstart', function () {
        App.load('calibration');
    });

    $('#logout', page).on('touchend', function () {
        Paddler.Session.destroy();
        window.location.reload();
    });


    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });
});


/**
 * Session list page.
 */
App.controller('sessions', function (page) {

    var $back = $('.back-button', page), $page = $(page);

    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });



    var $sessions = $page.find('#local-sessions');

    // handle delete
    $sessions.on('touchstart', '.session-row-delete-btn', function (e) {
        var $el = $(e.target);
        SessionEntity.delete(parseInt($el.attr('session-id')))
            .then(function () {
                $el.closest('li').remove();
            });
    });

    // load sessions
    SessionEntity.all(function (sessions) {
        var $li, $main, sessionAt, time, hours, minutes, duration, dDisplay;
        for (var i = 0; i < sessions.length; i++) {
            $li = $('<li class="session-row"></li>');

            $('<div class="session-row-wrapper"></div>')
                .append(($main = $('<div class="session-row-data-wrapper"></div>')))
                .append($('<div class="session-row-delete"></div>')
                    .append($('<div style="display:table;width:100%;height:100%"></div>')
                        .append($('<div class="session-row-delete-btn"></div>').attr("session-id", sessions[i].id).text("delete"))))
                .appendTo($li);


            sessionAt = moment(new Date(sessions[i].session_start));
            duration = moment.duration(sessions[i].session_end - sessions[i].session_start);

            hours = duration.hours();
            minutes = duration.minutes();

            if (hours > 0)
                dDisplay = hours + 'h' + lpad(minutes, 2);
            else
                dDisplay = lpad(minutes, 2) + "m";


            $('<div class="session-row-data"></div>')
                .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("MMM D")))
                .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("hh:mm:ss")))
                .append($("<div style=\"display:table-cell;text-transform:none\"/>").html(dDisplay))
                .append($("<div style=\"display:table-cell\"/>").html(Math.round2(sessions[i].distance || 0) + " km"))
                .appendTo($main)
            ;

            $li.appendTo($sessions);
        }

    });

    SessionEntity.sessionsSummary().then(function (data) {
        var time = Math.floor(data.duration / 1000);
        var hours = Math.floor(time / 3600);
        time = time - hours * 3600;
        var minutes = Math.floor(time / 60);
        var seconds = time - minutes * 60;
        $('#total-distance', page).text(Math.round2(data.distance));
        $('#top-speed', page).text(Math.round2(data.speed));
        $('#total-duration', page).text([lpad(hours, 2), lpad(minutes, 2), lpad(seconds, 2)].join(':'));
    });


    $page.on('appShow', function () {

        var width = $('.session-row-delete', page).width();

        Swiped.init({
            query: 'li',
            list: true,
            left: 0,
            right: width
        });

        new IScroll($('#sessions-wrapper', page)[0], {});
    });
});


/**
 * Calibration page.
 */
App.controller('calibration', function (page) {

    var $page = $(page)
        , $content = $page.find('.app-content')
        , $calibrate = $page.find('.calibrate');

    setTimeout(function () {
        $content.css({"line-height": $page.height() + "px"});
    }, 0);

    setTimeout(function () {
        var cal = new Calibrate(function () {
            $calibrate.removeClass('listening');
            $calibrate.addClass('finished');
            $calibrate.html("Done!");
            setTimeout(function () {
                App.back();
            }, 1500);
        });
        cal.start();

    }, 1000);

});

function onDeviceReady() {
    document.pd_device_ready = true;

    // Override default HTML alert with native dialog
    if (navigator.notification) {
        window.alert = function (message) {
            navigator.notification.alert(
                message,    // message
                null,       // callback
                "Paddler",  // title
                'OK'        // buttonName
            );
        };

        window.confirm = function (message, callback) {
            return navigator.notification.confirm(message, callback, "Paddler", null)
        }
    }

    document.addEventListener("backbutton", function (e) {
        try {
            App.back();
        } catch (te) {
            console.log(te);
        }
    }, false);

    // set to either landscape
    screen.lockOrientation('landscape');

    window.powermanagement.acquire();

    StatusBar.overlaysWebView( false );
    StatusBar.backgroundColorByHexString('#ffffff');
    StatusBar.styleDefault();

    loadDb();
    loadUi();
}

document.pd_device_ready = false;
if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
    document.addEventListener("deviceready", onDeviceReady, false);
} else {
    emulateCordova();
    loadDb();
    Paddler.Session.init();
    Paddler.Session.setUser(new Paddler.User(-1, 'local-test-user', 'local', 'test', 'local.test@gmail.com', undefined));
    Paddler.Session.setAccessToken('test-access-token');
    loadUi();
}

function loadDb() {
    db = window.sqlitePlugin.openDatabase({name: "sessions.db", "location": 2});

    var ddl = [
        [
            ["CREATE TABLE IF NOT EXISTS meta (",
                "version INTEGER NOT NULL",
                ")"],

            ["CREATE TABLE IF NOT EXISTS session (",
                "id INTEGER NOT NULL PRIMARY KEY,",
                "session_start INTEGER NOT NULL,",
                "session_end INTEGER,",
                "anglez REAL NOT NULL,",
                "noisex REAL NOT NULL,",
                "noisez REAL NOT NULL,",
                "factorx REAL NOT NULL,",
                "factorz REAL NOT NULL,",
                "axis INTEGER NOT NULL,",
                "distance REAL,",
                "avg_sr REAL,",
                "avg_speed REAL,",
                "top_sr REAL,",
                "top_speed REAL,",
                "synced INTEGER DEFAULT 0,",
                "synced_at INTEGER,",
                "debug TEXT,",
                "debug_synced INTEGER DEFAULT 0",
                ")"],

            ["CREATE TABLE IF NOT EXISTS session_data (",
                "id INTEGER NOT NULL PRIMARY KEY,",
                "session INTEGER NOT NULL,",
                "timestamp INTEGER NOT NULL,",
                "distance REAL,",
                "speed REAL,",
                "spm INTEGER,",
                "efficiency REAL",
                ")"]
        ]
    ];


    var success = function() {console.log('table created successfully')};
    var error = function(e) {
        console.log('error creating table', e);
    };
    db.transaction(function (tx) {
        var v1 = ddl[0], sql;
        for (var i = 0; i < v1.length; i++) {
            sql = v1[i].join('');
            console.log("DDL: ", sql);
            tx.executeSql(sql, [], success, error);
        }
    });

    var processing = {};
    setTimeout(function () {
        setInterval(function try2SyncSessions() {

            if (document.PREVENT_SYNC === true) return;

            var isOffline = 'onLine' in navigator && !navigator.onLine;

            if (isOffline)
                return;

            SessionEntity.findAllNotSynced(function (sessions) {
                var trainingSession, row;
                for (var i = 0; i < sessions.length; i++) {
                    if (processing[sessions[i].id] === true)
                        continue;

                    processing[sessions[i].id] = true;

                    trainingSession = new Paddler.TrainingSession();
                    trainingSession.setDate(new Date(sessions[i].session_start));
                    trainingSession.setAngleZ(sessions[i].anglez);
                    trainingSession.setNoiseX(sessions[i].noisex);
                    trainingSession.setNoiseZ(sessions[i].noisez);
                    trainingSession.setFactorX(sessions[i].factorx);
                    trainingSession.setFactorZ(sessions[i].factorz);
                    trainingSession.setAxis(sessions[i].axis);

                    SessionDataEntity.get(sessions[i].id, function (localId, session, debug) {
                        return function (rows) {
                            var dataPoints = [];
                            for (var j = 0; j < rows.length; j++) {
                                row = new Paddler.TrainingSessionData();
                                row.setTimestamp(rows[j].timestamp);
                                row.setDistance(rows[j].distance);
                                row.setSpeed(rows[j].speed);
                                row.setSpm(rows[j].spm);
                                row.setSpmEfficiency(rows[j].efficiency);
                                dataPoints.push(row);
                            }
                            session.setData(dataPoints);


                            Paddler.TrainingSessions.save(session).done(function (id) {
                                    return function (session) {

                                        IO.open(debug).then(IO.read).then(function (csv) {
                                            var rows = csv.split('\n');
                                            postDebugData(id, session.getId(), rows).done(function () {
                                                delete processing[localId];
                                            });
                                        });

                                        SessionEntity.synced(id);
                                        if (!debug)
                                            delete processing[localId];
                                    }
                                }(localId)).fail(function (res) {
                                    console.log('save failed'   , res)
                                    delete processing[localId];
                                }).exception(function (res) {
                                    delete processing[localId];
                                    console.log('save failed', res);
                                });
                        }
                    }(sessions[i].id, trainingSession, sessions[i].debug));
                }
            });

        }, 10000);
    }, 10000);

    return db;
}

function loadUi() {

    Paddler.Authentication.autoLogin(true).done(function() {
        App.load('home');
    }).fail(function() {
        App.load('login');
    });
}

function postDebugData(localSessionId, remoteSessionId, rows) {
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

    Paddler.DebugSessions.saveMultiple(remoteSessionId, sensorData)
        .then(function () {
            console.log('saved successfully');
            SessionEntity.debugSynced(localSessionId);
            defer.resolve();
        })
        .fail(function (e) {
            console.log('error saving debug data: ', e)
            defer.reject();
        });
    return defer.promise();
}