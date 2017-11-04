'use strict';

var Bluetooth = require('./bluetooth').Bluetooth;


function HeartRate () {
    var self = this;
    self.bluetooth = new Bluetooth();
}

HeartRate.prototype.listen = function (callback) {

    var self = this;
    // TODO: perhaps we will need to make sure we ask for a HR band...
    self.bluetooth.listen(function (metric) {
        callback(self.filter(metric));
    });
};

HeartRate.prototype.filter = function (metric) {
    // TODO: do any filter, if required
    return metric;
};

exports.HeartRate = HeartRate;
