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

    var onSuccess = function (position) {
        
        // first readings are always less accurate - discard them!
        if (self.counter < 5) {
            self.counter++;
            return;
        }

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
            title = 'Location is disabled';
            message = 'Please enable Location Services in <i>Settings > Privacy > Location Services</i> and in <i>Settings > Paddler</i>';
        } else if (device.platform === 'Android') {
            title = 'Unable to Acquire GPS Signal';
            message = 'Please make sure GPS is enabled in <i>Settings > Location</i>';
        }
        setTimeout(function () {
            self.appContext.ui.modal.alert(title, '<p>' + message + '</p>', 'OK');
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
 *
 * @param starting
 * @param ending
 * @returns {number}
 */
GPS.calcDistance = function (starting, ending) {
//    return haversineDistanceCalculation(starting, ending);
    return vincentyDistanceCalculation (starting, ending);
};


function haversineDistanceCalculation(starting, ending) {
    var KM_RATIO = 6371;
    try {
        var dLat = utils.toRadians(ending.coords.latitude - starting.coords.latitude);
        var dLon = utils.toRadians(ending.coords.longitude - starting.coords.longitude);
        var lat1Rad = utils.toRadians(starting.coords.latitude);
        var lat2Rad = utils.toRadians(ending.coords.latitude);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = KM_RATIO * c;

        if (isNaN(d)) {
            return 0;
        } else {
            return KM_RATIO * c;
        }
    } catch (e) {
        return 0;
    }
}

function vincentyDistanceCalculation(starting, ending) {
    var pointA = new LatLon(starting.coords.latitude, starting.coords.longitude);
    var pointB = new LatLon(ending.coords.latitude, ending.coords.longitude);

    var distance = pointA.distanceTo(pointB);
    if (isNaN(distance)) {
        return 0
    }
    return distance / 1000;
}

/**
 * Check if position shifted at least 5 or 10 meters (depending or accuracy)
 *
 * @param distance      actual distance, based on GPS.calcDistance
 * @param ending        current position
 * @returns {boolean}
 */
GPS.isLessThanMinMovement = function (distance, ending) {
    return distance < (ending.coords.accuracy < 10 ? 0.005 : 0.01);
};

GPS.evaluateMovement = function(previous, current, now) {
    if (!previous || !current) {
        return null;
    }

    var movement = GPS.calcDistance(previous, current);
    var period = current.timestamp - previous.timestamp;
    if (period > 1000) {

    }
    // speed in km/h
    var speed = movement * (1 / (period / 1000 / 3600));

    var gap = now - current.timestamp;
    if (gap > 0) {
        movement += GPS.calculateMovement(gap, speed);
    }

    return {
        distance: movement,
        speed: speed
    };
};

/**
 *
 * @param milis
 * @param speed     Km/h
 */
GPS.calculateMovement = function (milis, speed) {
    return speed / 3600000 * milis;
};

exports.GPS = GPS;
