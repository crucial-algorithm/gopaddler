'use strict';

var Bluetooth = require('./bluetooth').Bluetooth;
var Device = require('../model/device').Device;
var utils = require('../utils/utils');

/**
 *
 * @constructor
 */
function HeartRateSensor() {
    var self = this;

    self.devices = Device.latest();
    self.bluetooth = new Bluetooth();

    self.heartRate = 0;
    self.lastEventAt = null;
    self.retryTimer = null;
    self.unresponsiveTimer = null;
}

HeartRateSensor.prototype.listen = function (callback) {
    var self = this;
    clearInterval(self.retryTimer);
    clearInterval(self.unresponsiveTimer);

    if (self.devices.length === 0) {
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


            utils.loopAsync(self.devices, function (iterator) {
                var device = iterator.current();
                var updated = false;

                self.bluetooth.listen(device.getAddress(), function (hr) {
                    iterator.finish();

                    if (updated === false) {
                        Device.updateLastSeen(device.address);
                        updated = true;
                    }

                    self.lastEventAt = new Date().getTime();
                    callback(hr);
                }, function onError() {

                    self.bluetooth.disconnect(device.getAddress());

                    if (iterator.isFinished()) {

                        setTimeout(function(){
                            iterator.restart();
                            iterator.next();
                        }, 60000);

                        return;
                    }

                    iterator.next();
                }, /* don't retry = */ true);
            });

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
