'use strict';

import AppSettings from "./app-settings";

class Utils {

    static lpad(value, places) {
        let pad = new Array(places + 1).join('0');
        let str = value + "";
        return pad.substring(0, pad.length - str.length) + str;
    }

    /**
     *
     * @param value
     * @param decimalPlaces
     * @return {number}
     */
    static round(value, decimalPlaces) {
        if (decimalPlaces === 0) return Math.round(value);

        let precision = Math.pow(10, decimalPlaces);
        return Math.round(value * precision) / precision;
    }

    static round2(value) {
        if (!value) return 0;
        return Math.round(value * 100) / 100;
    }

    static round1(value) {
        return Math.round(value * 10) / 10;
    }

    static toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    static isNetworkConnected() {

        return navigator.connection.type === Connection.ETHERNET ||
            navigator.connection.type === Connection.WIFI ||
            navigator.connection.type === Connection.CELL_2G ||
            navigator.connection.type === Connection.CELL_3G ||
            navigator.connection.type === Connection.CELL_4G ||
            navigator.connection.type === Connection.CELL;
    }

    static onWifi() {
        return navigator.connection.type === Connection.ETHERNET || navigator.connection.type === Connection.WIFI;
    }

    static avg(arr) {
        if (arr.length === 0) return 0;
        let value = 0;
        for (let i = 0; i < arr.length; i++) {
            value += arr[i];
        }
        return value / arr.length;
    }

    static kmToMiles(kms) {
        return kms * 0.621371;
    }

    static meterToFeet(meters) {
        return meters * 3.28084;
    }

    /**
     * Convert actions from browser actions into native ones (by registering plugins)
     */
    static mapBrowserToNative() {

        // Override default HTML alert with native dialog
        if (navigator.notification) {
            window.alert = function (message) {
                navigator.notification.alert(
                    message,    // message
                    null,       // callback
                    AppSettings.applicationName(),  // title
                    'OK'        // buttonName
                );
            };

            window.confirm = function (message, callback) {
                return navigator.notification.confirm(message, callback, AppSettings.applicationName(), null)
            }
        }

        document.addEventListener("backbutton", function (e) {
            try {
                let success = App.back();
                if (success === false) {
                    $(App.getPage()).trigger('androidBackButton');
                }
            } catch (te) {
                console.log(te);
            }
        }, false);

        window.powermanagement.acquire();

        StatusBar.overlaysWebView(false);
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();
    }

    static notify(username, message) {
        Utils._postSlack(Utils.getUrl("notifications"), username, message);
    }

    static debug(username, message) {
        Utils._postSlack(Utils.getUrl("debug"), username, message);
    }

    static usage(username, message) {
        Utils._postSlack(Utils.getUrl("usage"), username, message);
    }

    static _postSlack(url, username, message) {
        try {
            if (navigator.userAgent === 'gp-dev-ck') {
                console.debug("[ " + username + " ] " + message);
                return;
            }
            $.ajax({
                type: "POST",
                url: url,
                data: JSON.stringify({
                    text: "[" + username + "] " + message
                    , username: "GoPaddler", icon_emoji: ":monkey_face:"
                }),
                dataType: "json"
            });
        } catch (excp) {
            console.log(excp);
        }
    }

    static getUrl(type) {

        if (type === 'debug') {
            // # debug
            return "https://hooks.slack.com/services/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";
        }

        if (type === 'usage') {
            // #app
            return 'https://hooks.slack.com/services/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';
        }

        if (type === 'notifications') {
            // # notifications
            return "https://hooks.slack.com/services/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";
        }

    }

    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static numberOrZero(n) {
        return typeof n === "number" ? n : 0

    }

    static EndlessIterator(from, to) {
        let position = from - 1;
        let random;

        to = Utils.numberOrZero(to);

        // not proper behavior, but required for the usage in session-view! handle from = 1 and to = 0
        if (from > to) {
            return new Utils.NeverLockIterator();
        }

        random = Utils.getRandomInt(from, to);

        this.next = function () {
            position++;

            if (position > to) {
                position = from;
            }

            return position;
        };

        /**
         * Acquired position at a regular step
         * Locked means that position matches the step
         * @returns {boolean}
         */
        this.locked = function () {
            return position === random;
        }
    }

    static NeverLockIterator() {
        this.next = function () {
        };
        this.locked = function () {
            return false;
        }
    }

    /**
     * Hack to force safari to reflow and make layout's ok again
     * @param dom
     */
    static forceSafariToReflow(dom) {
        dom.style.display = 'none';
        dom.offsetHeight; // no need to store this anywhere, the reference is enough
        dom.style.display = '';
    }

    static guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    static loopAsync(list, callback) {
        let originalList = list.slice(0);
        list = list.slice(0);
        let value = list.pop();

        let iterator = {
            next: function () {
                value = list.pop();
                callback.apply({}, [iterator]);
            },

            current: function () {
                return value === undefined ? null : value;
            },

            isFinished: function () {
                return list.length === 0;
            },

            finish: function () {
                list = [];
            },

            restart: function () {
                list = originalList.slice(0);
            }
        };

        callback.apply({}, [iterator])
    }

    static speedToPace(speed, convertToImperial) {
        let value;
        if (convertToImperial === true) {
            value = 60 / Utils.kmToMiles(speed);
        } else {
            value = 60 / speed;
        }

        if (isNaN(value) || !isFinite(value)) {
            return 0;
        }

        let decimal = (value % 1);
        let minutes = value - decimal;
        let seconds = Math.round(decimal * 60);

        return minutes + ":" + Utils.lpad(seconds, 2);
    }

    static calculateAverageSpeed(distance, duration) {
        if (distance === 0 || duration === 0) return 0;
        return distance / (duration / 3600000);
    }

    static calculateStrokeLength(spm, speed) {
        if (spm === 0 || speed === 0) return 0;
        return (speed * 1000 / 3600) / (spm / 60);
    }

    static duration(milis) {
        if (milis < 60000) return (milis / 1000) + "''";

        let minutes = Math.floor(milis / 60000);
        let seconds = Math.round((milis / 60000 - minutes) * 60);

        if (seconds === 0) return minutes + "'";

        return minutes + "'" + seconds + "''";
    }

    static minMaxAvgStddev(data) {
        let total = 0, min = null, max = null;
        data.map(function (value) {
            total += value;
            if (min === null || value < min) {
                min = value;
            }
            if (max === null || value > max) {
                max = value;
            }
        });
        let avg = total / data.length;
        let diffs = 0;
        data.map(function (value) {
            diffs += (avg - value) * (avg - value);
        });

        let stddev = Math.sqrt(diffs / data.length);
        return {
            min: min,
            max: max,
            avg: avg,
            stddev: stddev
        }
    }


    /**
     * @typedef {object} Slider
     *
     * @property {function} next
     * @property {function} previous
     * @property {function} shake
     */

    /**
     *
     * @param $dom
     * @param defaultSpeed
     * @return Slider
     */
    static enrichSlickWithActionsForGestureTips($dom, defaultSpeed) {
        return {
            next: function (speed = 2000, reset = null) {
                $dom.slick('slickSetOption', 'speed', speed);
                $dom.slick('slickNext');
                $dom.slick('slickSetOption', 'speed', reset !== null ? reset : defaultSpeed);
            },
            previous: function (speed = 2000, reset = null) {
                $dom.slick('slickSetOption', 'speed', speed);
                $dom.slick('slickPrev');
                $dom.slick('slickSetOption', 'speed', reset !== null ? reset : defaultSpeed);
            },
            shake: function (forward = 800, wait = 400, back = 800) {
                let $active = $dom.find('.slick-active');
                $active.animate({marginLeft: $active.width() / 1.7 * -1}, forward, undefined, function () {
                    setTimeout(function () {
                        $active.animate({marginLeft: 0}, back);
                    }, wait);
                });
            }
        }

    }

    static heartRateReserveCalculation(resting, max, hr) {
        return Math.floor(((resting - hr) / (max - resting)) * -100)
    }


    /**
     *
     * @param duration
     * @param {boolean} includeMilis
     * @return {string}
     */
    static displayDurationHasTime(duration, includeMilis = false) {
        let hour, minute, second, elapsed, milisString = duration + "";

        elapsed = Math.round(duration / 1000);
        minute = Math.floor(elapsed / 60);
        second = elapsed - minute * 60;
        milisString = milisString.substr(milisString.length - 3, 3);

        hour = 0;
        if (minute > 0) {
            hour = Math.floor(minute / 60);
            minute = minute - hour * 60;
        }
        return zeroPad(hour) + ':' + zeroPad(minute) + ':' + zeroPad(second) + (includeMilis ? "." + milisString : '');
    }

}

function zeroPad(value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
}

export default Utils