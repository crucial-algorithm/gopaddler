'use strict';

var Bluetooth = require('./bluetooth').Bluetooth;

/**
 *
 * @constructor
 */
function HeartRateSensor() {
    var self = this;

    self.devices = ["180D"];
    self.deviceAddress = localStorage.getItem('ble-mac-address');
    self.bluetooth = new Bluetooth();

    self.heartRate = 0;
}

HeartRateSensor.prototype.listen = function (callback) {
    var self = this;

    if (!self.deviceAddress) {
        return;
    }
    self.lastEventAt = new Date().getTime();

    setInterval(function () {
        if (new Date().getTime() - self.lastEventAt > 15000) {
            callback(0)
        }
    }, 5000);

    self.bluetooth
        .initialize()
        .then(function () {
            self.bluetooth.listen(self.deviceAddress, function (hr) {
                self.lastEventAt = new Date().getTime();
                // process heart rate
                callback(hr);
            })
        });
};

HeartRateSensor.prototype.stop = function () {
    var self = this;
    self.bluetooth.disconnect(self.deviceAddress);
};

exports.HeartRateSensor = HeartRateSensor;
