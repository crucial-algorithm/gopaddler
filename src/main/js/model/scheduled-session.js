var Api = require('../server/api');

function ScheduledSession() {
    this.date = null;
    this.expression = null;
    this.id = null;
    this.splits = null;

}

ScheduledSession.prototype.getDate = function () {
    return this.date;
};

ScheduledSession.prototype.getExpression = function () {
    return this.expression;
};

ScheduledSession.prototype.getId = function () {
    return this.id;
};

ScheduledSession.prototype.getSplits = function () {
    return this.splits ? this.splits.slice(0) : null;
};

ScheduledSession.prototype.loadFromServerResponse = function (json) {
    this.date = json.date;
    this.expression = json.expression.text;
    this.id = json.session.id;
    this.splits = json.session.splits;
};

ScheduledSession.prototype.fromJson = function (json) {
    this.date = json.date;
    this.expression = json.expression;
    this.id = json.id;
    this.splits = json.splits;
};

ScheduledSession.prototype.toJson = function () {
    return {
        date: this.date,
        expression: this.expression,
        id: this.id,
        splits: this.splits
    };
};




ScheduledSession.save = function (list) {
    var s, result = [];
    for (var i = 0; i < list.length; i++) {
        result.push(list[i].toJson());
    }

    window.localStorage.setItem("scheduled-sessions", JSON.stringify(result));
};

ScheduledSession.load = function () {
    var list = JSON.parse(window.localStorage.getItem("scheduled-sessions"));
    if (!list)
        return undefined;

    var result = [], s;
    for (var i = 0; i < list.length; i++) {
        s = new ScheduledSession();
        s.fromJson(list[i]);
        result.push(s);
    }

    return result;
};

ScheduledSession.sync = function () {
    var deferred = $.Deferred();
    Api.TrainingSessions.scheduled().then(function (sessions) {
        var s, result = [];
        for (var i = 0; i < sessions.length; i++) {
            s = new ScheduledSession();
            s.loadFromServerResponse(sessions[i])
            result.push(s);
        }

        ScheduledSession.save(result);
        deferred.resolve(result);
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise();
};



exports.ScheduledSession = ScheduledSession;