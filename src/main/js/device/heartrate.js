'use strict';

function HeartRate (Bluetooth) {
    var self = this;
    self.bluetooth = Bluetooth;
}

HeartRate.prototype.listen = function () {
    self.bluetooth.start(
        // Success
        function () {

        },
        // Failure
        function () {

        }
    )
};

exports.HeartRate = HeartRate;
