'use strict';

import Api from '../server/api';

/**
 * @typedef {Object} SplitDefinition
 * @property {number} _duration
 * @property {boolean} _recovery
 * @property {string} _unit
 */

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

    static load(isDev = false) {
        if (isDev === true) {
            return [...DEV_EXPRESSIONS];
        }
        if (Api.User.hasCoach() === false) {
            return [...SAMPLE_EXPRESSIONS];
        }
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
            deferred.resolve([...SAMPLE_EXPRESSIONS]);
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

// expressions for PROD
const SAMPLE_EXPRESSIONS = [
    {
        id: "Hiyc4CZTX4ZGWLsFh",
        expression: "5 x (6’/1’ + 2’)/4’",
        splits: [
            {_duration: 6, _recovery: false, _unit: 'minutes'}, {_duration: 1, _recovery: true, _unit: 'minutes'},
            {_duration: 2, _recovery: false, _unit: 'minutes'}, {_duration: 4, _recovery: true, _unit: 'minutes'},
            {_duration: 6, _recovery: false, _unit: 'minutes'}, {_duration: 1, _recovery: true, _unit: 'minutes'},
            {_duration: 2, _recovery: false, _unit: 'minutes'}, {_duration: 4, _recovery: true, _unit: 'minutes'},
            {_duration: 6, _recovery: false, _unit: 'minutes'}, {_duration: 1, _recovery: true, _unit: 'minutes'},
            {_duration: 2, _recovery: false, _unit: 'minutes'}, {_duration: 4, _recovery: true, _unit: 'minutes'},
            {_duration: 6, _recovery: false, _unit: 'minutes'}, {_duration: 1, _recovery: true, _unit: 'minutes'},
            {_duration: 2, _recovery: false, _unit: 'minutes'}, {_duration: 4, _recovery: true, _unit: 'minutes'},
            {_duration: 6, _recovery: false, _unit: 'minutes'}, {_duration: 1, _recovery: true, _unit: 'minutes'},
            {_duration: 2, _recovery: false, _unit: 'minutes'}]
    },

    {
        id: "DCdaSuSEtji6Emivf",
        expression: "2 x 1000m/8’ + 2 x 750m/8’",
        splits: [
            {_duration: 1000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 1000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 750, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 750, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'}
        ]
    }
];

const DEV_EXPRESSIONS = [
    {
        expression: "20''/10'' + 20''/10''",
        id: 1,
        splits: [{_duration: 20, _recovery: false, _unit: 'seconds'}, {_duration: 10, _recovery: true, _unit: 'seconds'},{_duration: 20, _recovery: false, _unit: 'seconds'}],
        date: moment().add(-3, 'd')
    },
    {
        expression: "50m/10'' + 50m/10'",
        id: 1,
        splits: [{_duration: 100, _recovery: false, _unit: 'meters'}, {_duration: 20, _recovery: true, _unit: 'seconds'},{_duration: 100, _recovery: false, _unit: 'meters'}],
        date: moment().add(-2, 'd')
    }
];


export default ScheduledSession;
