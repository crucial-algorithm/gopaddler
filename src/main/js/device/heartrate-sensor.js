'use strict';

var Bluetooth = require('./bluetooth').Bluetooth;

/**
 *
 * @constructor
 */
function HeartRateSensor () {
    var self = this;

    self.devises   = ["180D"];
    self.bluetooth = new Bluetooth();
    self.heartRate = 0;
}

HeartRateSensor.prototype.listen = function (callback) {
    var self = this;

    self.bluetooth
        .initialize()
        .then(function () {
            self.bluetooth
                .searchFor(self.devices, callback)
                .then(function () {
                    
                })
            ;
        });
};

exports.HeartRateSensor = HeartRateSensor;
