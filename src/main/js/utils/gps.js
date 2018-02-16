'use strict';

var utils = require('./utils.js');


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
        
        if (position.coords.accuracy > 10) return;

        // make sure that the reading has the necessary precision
        if (!self.isAcceptablePosition(position, self.currentPosition))
            return;

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


    self.watchId = navigator.geolocation.watchPosition(onSuccess, onError, { timeout: 60000, enableHighAccuracy: true, maximumAge: 500 });

    self.started = true;
};

GPS.prototype.stop = function() {
    var self = this;
    navigator.geolocation.clearWatch(self.watchId);
};


GPS.prototype.isAcceptablePosition = function (position, currentPosition) {
    var self = this;
    if (currentPosition === undefined) {
        // A new location is always better than no location
        return true;
    }

    // Check whether the new location fix is newer or older
    var timeDelta = position.timestamp - currentPosition.timestamp;
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
    
    // don't notify if last update was less then 1 sec ago
    if (timeDelta < 1000) {
        return false;
    }


    // Check whether the new location fix is more or less accurate
    var accuracyDelta = position.coords.accuracy - currentPosition.accuracy;
    var isMoreAccurate = accuracyDelta < 0;
    var isSignificantlyLessAccurate = accuracyDelta > 10;

    // ignore position that haven't at least shifted 5 or 10 meters (depending or accuracy)
    if (GPS.calcDistance(currentPosition, position) < (position.coords.accuracy < 10 ? 0.005 : 0.01)) {
        return false;
    }

    // Determine location quality using a combination of timeliness and accuracy
    if (isMoreAccurate) {
        return true;
    } else if (isNewer && !isSignificantlyLessAccurate ) {
        return true;
    }
    return false;
};


GPS.calcDistance = function (starting, ending) {
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

        if (isNaN(d))
            return 0;
        else
            return KM_RATIO * c;
    } catch (e) {
        return 0;
    }
};


exports.GPS = GPS;
