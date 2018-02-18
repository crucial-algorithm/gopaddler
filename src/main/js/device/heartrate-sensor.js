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
    self.retryTimer = null;
    self.unresponsiveTimer = null;
}

HeartRateSensor.prototype.listen = function (callback) {
    var self = this;
    clearInterval(self.retryTimer);
    clearInterval(self.unresponsiveTimer);

    if (!self.deviceAddress) {
        return;
    }

    self.lastEventAt = new Date().getTime();

    self.unresponsiveTimer = setInterval(function () {
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
        })
        .catch(function (err) {
            if (err.reason !== 'disabled') {
                return;
            }

            self.retryTimer = setInterval(function () {
                self.listen(callback);
            }, 30000);
        });
};

HeartRateSensor.prototype.stop = function () {
    var self = this;
    self.bluetooth.disconnect(self.deviceAddress);
    clearInterval(self.unresponsiveTimer);
    clearInterval(self.retryTimer);
};

exports.HeartRateSensor = HeartRateSensor;
