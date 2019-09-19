'use strict';

import Api from '../server/api';

class ScheduledSession {

    constructor(date = null, expression = null, id = null, splits = null) {
        this._date = date;
        this._expression = expression;
        this._id = id;
        this._splits = splits;
    }

    /**
     *
     * @param {ScheduledSession[]} list
     */
    static save(list) {
        let result = [];
        for (let session of list) {
            result.push(session.toJson());
        }

        window.localStorage.setItem("scheduled-sessions", JSON.stringify(result));
    }

    static load() {
        let list = JSON.parse(window.localStorage.getItem("scheduled-sessions"));
        if (!list)
            return undefined;

        let result = [], s;
        for (let json of list) {
            s = new ScheduledSession();
            s.fromJson(json);
            result.push(s);
        }

        return result;
    }

    static sync() {
        let deferred = $.Deferred();

        if (!Api.User.hasCoach()) {
            deferred.resolve([]);
            return deferred.promise();
        }

        Api.TrainingSessions.scheduled().then(function (sessions) {
            var s, result = [];
            for (var i = 0; i < sessions.length; i++) {
                s = new ScheduledSession();
                s.loadFromServerResponse(sessions[i]);
                result.push(s);
            }

            ScheduledSession.save(result);
            deferred.resolve(result);
        }).fail(function (err) {
            console.log(err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    loadFromServerResponse(json) {
        this.date = json.date;
        this.expression = json.expression.text;
        this.id = json.session.id;
        this.splits = json.session.splits;
    }

    fromJson(json) {
        this.date = json.date;
        this.expression = json.expression;
        this.id = json.id;
        this.splits = json.splits;
    }

    toJson() {
        return {
            date: this.date,
            expression: this.expression,
            id: this.id,
            splits: this.splits
        };
    }

    get date() {
        return this._date;
    }

    set date(value) {
        this._date = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get splits() {
        return this._splits;
    }

    set splits(value) {
        this._splits = value;
    }
}

export default ScheduledSession;
