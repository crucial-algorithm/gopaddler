'use strict';

var utils = require('./utils.js');
var LatLon = require('geodesy/latlon-vincenty');


function GPS (context) {
    var self = this;
    self.listeners = [];
    self.watchId = undefined;
    self.currentPosition = undefined;
    self.counter = 0;
    self.appContext = context;
    self.totalGaps = 0;
    self.sumGaps = 0;
}

GPS.prototype.listen = function(callback) {
    var self = this;
    self.listeners.push(callback);
    if (!self.started)
        self.start();
};

GPS.prototype.start = function() {
    var self = this;

    this.startTs = new Date().getTime();
    var before = null;

    var onSuccess = function (position) {
        
        // first readings are always less accurate - discard them!
        if (self.counter < 5) {
            self.counter++;
            return;
        }

        if (before === null) {
            before = Date.now();
        } else {
            var now = Date.now();
            self.sumGaps += now - before;
            self.totalGaps++;
            before = now;
        }
        self.counter++;


        // make sure that the reading has the necessary precision
        if (!self.isAcceptablePosition(position, self.currentPosition)) {
            return;
        }

        for (var i = 0, length = self.listeners.length; i < length; i++) {
            self.listeners[i].apply(undefined, [position]);
        }

        self.currentPosition = position;
    };

    var onError = function (error) {
        console.log(error);

        if (new Date().getTime() - self.startTs > 80000)
            return;

        var message, title;
        if (device.platform === 'iOS') {
            title = self.appContext.translate('gps_failed_title_ios');
            message = self.appContext.translate('gps_failed_title_message_ios');
        } else if (device.platform === 'Android') {
            title = self.appContext.translate('gps_failed_title_android');
            message = self.appContext.translate('gps_failed_title_message_android');
        }
        setTimeout(function () {
            self.appContext.ui.modal.alert(title, '<p>' + message + '</p>', self.appContext.translate("gps_failed_acknowledge"));
        }, 2000);
    };

    self.watchId = navigator.geolocation.watchPosition(onSuccess, onError, { timeout: 60000, enableHighAccuracy: true, maximumAge: 0 });

    self.started = true;
};

GPS.prototype.stop = function() {
    var self = this;
    navigator.geolocation.clearWatch(self.watchId);
};


/**
 *
 * @param position           New position retrieved by the GPS
 * @param previousPosition   Previous kwnon position
 * @returns {boolean}
 */
GPS.prototype.isAcceptablePosition = function (position, previousPosition) {

    if (position.coords.accuracy > 10) {
        return false;
    }

    if (previousPosition === undefined) {
        // A new location is always better than no location
        return true;
    }

    // Check whether the new location fix is newer or older
    var timeDelta = position.timestamp - previousPosition.timestamp;
    var isSignificantlyNewer = timeDelta > 5000;
    var isSignificantlyOlder = timeDelta < -5000;
    var isNewer = timeDelta > 0;

    // If it's been more than two minutes since the current location, use the new location
    // because the user has likely moved
    if (isSignificantlyNewer) {
        return true;
        // If the new location is more than two minutes older, it must be worse
    } else if (isSignificantlyOlder) {
        return false;
    }

    // Check whether the new location fix is more or less accurate
    var accuracyDelta = position.coords.accuracy - previousPosition.accuracy;
    var isMoreAccurate = accuracyDelta < 0;
    var isSignificantlyLessAccurate = accuracyDelta > 10;

    // Determine location quality using a combination of timeliness and accuracy
    if (isMoreAccurate) {
        return true;
    } else if (isNewer && !isSignificantlyLessAccurate ) {
        return true;
    }
    return false;
};

/**
 * GPS on iphone refreshes at higher rates than 1Hz, depending on speed;
 * Not in use, but could be used to implement distinct behaviour on low frequency GPS vs 1 Hz GPSs
 * @returns {number}
 */
GPS.prototype.calculateHardwareRefreshRate = function () {
    return Math.round(this.sumGaps / this.totalGaps / 1000);
};

/**
 *
 * @param starting
 * @param ending
 * @returns {number}
 */
GPS.calcDistance = function (starting, ending) {
    // replaced haversine implementation
    return vincentyDistanceCalculation (starting, ending);
};

function vincentyDistanceCalculation(starting, ending) {
    var pointA = new LatLon(starting.coords.latitude, starting.coords.longitude);
    var pointB = new LatLon(ending.coords.latitude, ending.coords.longitude);

    var distance = pointA.distanceTo(pointB);
    if (isNaN(distance)) {
        return 0
    }
    return distance / 1000;
}

exports.GPS = GPS;
