'use strict';

var utils = require('./utils.js');


function GPS () {
    var self = this;
    self.listeners = [];
    self.watchId = undefined;
}

GPS.prototype.listen = function(callback) {
    var self = this;
    self.listeners.push(callback);
    if (!self.started)
        self.start();
};

GPS.prototype.start = function() {
    var self = this;


    var onSuccess = function (position) {
        if (position.coords.accuracy > 10) return;

        for (var i = 0, length = self.listeners.length; i < length; i++) {
            self.listeners[i].apply(undefined, [position]);
        }
    };

    var onError = function (error) {
        alert('GPS: failed to get GPS signal');
        console.log(error);
    };


    utils.pdOnDeviceReady(function gpsListenDeviceReady() {
        self.watchId = navigator.geolocation.watchPosition(onSuccess, onError, { timeout: 60000, enableHighAccuracy: true, maximumAge: 500 });
    }, function gpsFailureDeviceReady(e) {
        console.log('GPS: no signal found - are you viewing in browser? ' + e)
    });

    self.started = true;
};

GPS.prototype.stop = function() {
    var self = this;
    navigator.geolocation.clearWatch(self.watchId);
};


GPS.calcDistance = function (starting, ending) {
    var KM_RATIO = 6371;
    try {
        var dLat = Math.toRadians(ending.coords.latitude - starting.coords.latitude);
        var dLon = Math.toRadians(ending.coords.longitude - starting.coords.longitude);
        var lat1Rad = Math.toRadians(starting.coords.latitude);
        var lat2Rad = Math.toRadians(ending.coords.latitude);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = KM_RATIO * c;

        if (isNaN(d))
            return 0;
        else
            return KM_RATIO * c;
    } catch (e) {
        return 0;
    }
};


exports.GPS = GPS;