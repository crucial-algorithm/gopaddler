'use strict'

function Session(page) {
    var self = this;
    var record, records = [];

    this.sessionId = new Date().getTime();
    this.createdAt = this.sessionId;

    this.db = window.localStorage;


    var gps = new GPS();
    var strokeDetector = new StrokeDetector(self.sessionId, Calibrate.load());

    var $page = $(page);
    $page.off('appDestroy').on('appDestroy', function () {
        if (!timer) return;

        clearInterval(self.intervalId);

        timer.stop();
        gps.stop();
        strokeDetector.stop();

        self.flush(records);

    });

    self.createSession();

    var timer = new Timer($('.yellow', page));
    timer.start();

    var speed = new Speed($('.blue', page), gps);
    speed.start();

    var distance = new Distance($('.red', page), gps);
    distance.start();

    var strokeRate = new StrokeRate($('.session-left', page), strokeDetector);
    strokeRate.start();

    self.intervalId = setInterval(function () {
        record = {
            spm: strokeRate.getValue(),
            speed: speed.getValue(),
            distance: distance.getValue()
        };
        records.push(record);

        if (records.length > 10) {
            self.flush(self.idx, records);
            records = [];
        }
    }, 1000);


    var back = function () {
        App.back('home');
    };

    $page.on('swipeRight', back);
    $page.on('swipeLeft', back);
    var tx = false;
    $page.on('appBeforeBack', function (e) {
        if (tx) {
            tx = false;
            return true;
        }
        confirm("Finish Session?", function (r) {
            if (r == 1) {
                tx = true;
                App.back('home');
            }
        });
        return false;
    });
}


Session.prototype.createSession = function () {
    var sessions = JSON.parse(this.db.getItem("sessions"))
        , session = {id: this.sessionId, created_at: this.createdAt, data: []};
    if (!sessions) {
        sessions = [];
    }

    sessions.push(session);
    this.idx = sessions.length - 1;

    this.db.setItem("sessions", JSON.stringify(sessions));
}

Session.prototype.flush = function(idx, values) {
    var sessions = JSON.parse(this.db.getItem("sessions"))
        , session = sessions[this.idx];

    session.data = session.data.concat(values);
    sessions[this.idx] = session;

    try {
        this.db.setItem("sessions", JSON.stringify(sessions));
    } catch (e) {
    }
}