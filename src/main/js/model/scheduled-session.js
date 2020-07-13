'use strict';

import Api from '../server/api';
import AppSettings from "../utils/app-settings";

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

    /**
     *
     * @param isDev
     * @return {Array<ScheduledSession>}
     */
    static load(isDev = false) {
        let list = JSON.parse(window.localStorage.getItem("scheduled-sessions"))

        if (isDev === true) {
            list = [...DEV_EXPRESSIONS];
        }
        if (Api.User.hasCoach() === false) {
            list = ScheduledSession.sampleSessions();
        }
        if (!list)
            return [];

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
            deferred.resolve(ScheduledSession.sampleSessions());
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

    static sampleSessions() {
        let sessions = [];
        AppSettings.switch(() => {
            sessions = [...SAMPLE_CANOEING_EXPRESSIONS]
        }, () => {
            sessions = [...SAMPLE_CYCLING_EXPRESSIONS]
        })
        return sessions;
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
const SAMPLE_CANOEING_EXPRESSIONS = [
    {
        id: "KpBuBNb5NGqcA4QxJ",
        date: new Date(Date.now() - 86400000),
        expression: "4 x 5'/7’",
        splits: [
            {_duration: 5, _recovery: false, _unit: 'minutes'}, {_duration: 7, _recovery: true, _unit: 'minutes'},
            {_duration: 5, _recovery: false, _unit: 'minutes'}, {_duration: 7, _recovery: true, _unit: 'minutes'},
            {_duration: 5, _recovery: false, _unit: 'minutes'}, {_duration: 7, _recovery: true, _unit: 'minutes'},
            {_duration: 5, _recovery: false, _unit: 'minutes'}, {_duration: 7, _recovery: true, _unit: 'minutes'},
            {_duration: 5, _recovery: false, _unit: 'minutes'}]
    },

    {
        id: "5cTfZPtBoTxMTzmSs",
        expression: "2 x 1000m/8’ + 2 x 750m/8’",
        date: new Date(Date.now() - 2 * 86400000),
        splits: [
            {_duration: 1000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 1000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 750, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 750, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'}
        ]
    }
];

const SAMPLE_CYCLING_EXPRESSIONS = [
    {
        id: "Hiyc4CZTX4ZGWLsFh",
        expression: "5 x (6’/1’ + 2’)/4’",
        date: new Date(Date.now() - 86400000),
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
        expression: "2 x 4000m/8’ + 2 x 2000m/8’",
        date: new Date(Date.now() - 2 * 86400000),
        splits: [
            {_duration: 4000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 4000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 2000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'},
            {_duration: 2000, _recovery: false, _unit: 'meters'}, {_duration: 8, _recovery: true, _unit: 'minutes'}
        ]
    }
];

const DEV_EXPRESSIONS = [
    {
        expression: "20''/10'' + 20''/10''",
        id: 1,
        splits: [{_duration: 20, _recovery: false, _unit: 'seconds'}, {_duration: 10, _recovery: true, _unit: 'seconds'},{_duration: 20, _recovery: false, _unit: 'seconds'}],
        date: new Date(Date.now() - 86400000),
    },
    {
        expression: "50m/10'' + 50m/10'",
        id: 1,
        splits: [{_duration: 100, _recovery: false, _unit: 'meters'}, {_duration: 20, _recovery: true, _unit: 'seconds'},{_duration: 100, _recovery: false, _unit: 'meters'}],
        date: new Date(Date.now() - 2 * 86400000),
    }
];


export default ScheduledSession;
