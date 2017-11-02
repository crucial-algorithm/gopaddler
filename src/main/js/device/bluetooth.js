'use strict';

function Bluetooth () {
    var self = this;
    self.isEnabled = false;
    self.foundDevices = [];
}

function startScanSuccess(result) {
    console.log("startScanSuccess(" + result.status + ")");

    if (result.status === "scanStarted") {
        console.log("Scanning for devices (will continue to scan until you select a device)...", "status");
    } else if (result.status === "scanResult") {
        if (!foundDevices.some(function (device) {
                return device.address === result.address;

            })) {

            console.log('FOUND DEVICE:');
            console.log(result);
            foundDevices.push(result);
            connect(result.address);
        }
    }
}

function connect(address) {
    console.log('Connecting to device: ' + address + "...", "status");

    stopScan();

    new Promise(function (resolve, reject) {
        bluetoothle.connect(resolve, reject, { address: address });
    }).then(connectSuccess, handleError);
}

function stopScan() {
    new Promise(function (resolve, reject) {
        bluetoothle.stopScan(resolve, reject);
    }).then(stopScanSuccess, handleError);
}

function connectSuccess(result) {
    console.log("- " + result.status);

    if (result.status === "connected") {

        getDeviceServices(result.address);
    }
    else if (result.status === "disconnected") {

        console.log("Disconnected from device: " + result.address, "status");
    }
}

function getDeviceServices(address) {
    console.log("Getting device services...", "status");

    var platform = window.cordova.platformId;

    if (platform === "android") {

        new Promise(function (resolve, reject) {

            bluetoothle.discover(resolve, reject,
                { address: address });

        }).then(discoverSuccess, handleError);

    }
    else if (platform === "windows") {

        new Promise(function (resolve, reject) {

            bluetoothle.services(resolve, reject,
                { address: address });

        }).then(servicesSuccess, handleError);

    }
    else {

        console.log("Unsupported platform: '" + window.cordova.platformId + "'", "error");
    }
}

function servicesSuccess(result) {

    console.log("servicesSuccess()");
    console.log(result);

    if (result.status === "services") {

        var readSequence = result.services.reduce(function (sequence, service) {

            return sequence.then(function () {

                console.log('Executing promise for service: ' + service);

                new Promise(function (resolve, reject) {

                    bluetoothle.characteristics(resolve, reject,
                        { address: result.address, service: service });

                }).then(characteristicsSuccess, handleError);

            }, handleError);

        }, Promise.resolve());

        // Once we're done reading all the values, disconnect
        readSequence.then(function () {

            new Promise(function (resolve, reject) {

                bluetoothle.disconnect(resolve, reject,
                    { address: result.address });

            }).then(connectSuccess, handleError);

        });
    }

    if (result.status === "services") {

        result.services.forEach(function (service) {

            new Promise(function (resolve, reject) {

                bluetoothle.characteristics(resolve, reject,
                    { address: result.address, service: service });

            }).then(characteristicsSuccess, handleError);

        });

    }
}

function discoverSuccess(result) {

    console.log("Discover returned with status: " + result.status);

    if (result.status === "discovered") {

        // Create a chain of read promises so we don't try to read a property until we've finished
        // reading the previous property.

        var readSequence = result.services.reduce(function (sequence, service) {

            return sequence.then(function () {

                return addService(result.address, service.uuid, service.characteristics);
            });

        }, Promise.resolve());

        // Once we're done reading all the values, disconnect
        readSequence.then(function () {

            new Promise(function (resolve, reject) {

                bluetoothle.disconnect(resolve, reject,
                    { address: result.address });

            }).then(connectSuccess, handleError);

        });

    }
}

function characteristicsSuccess(result) {

    console.log("characteristicsSuccess()");
    console.log(result);

    if (result.status === "characteristics") {

        return addService(result.address, result.service, result.characteristics);
    }
}

function addService(address, serviceUuid, characteristics) {

    console.log('Adding service ' + serviceUuid + '; characteristics:');
    console.log(characteristics);

    var readSequence = Promise.resolve();

    characteristics.forEach(function (characteristic) {

        readSequence = readSequence.then(function () {

            return new Promise(function (resolve, reject) {

                bluetoothle.read(resolve, reject,
                    { address: address, service: serviceUuid, characteristic: characteristic.uuid });

            }).then(readSuccess, handleError);

        });
    });

    return readSequence;
}

function readSuccess(result) {

    console.log("readSuccess():");
    console.log(result);

}

function stopScanSuccess() {

    if (!foundDevices.length) {

        console.log("NO DEVICES FOUND");
    }
    else {

        console.log("Found " + foundDevices.length + " devices.", "status");
    }
}

Bluetooth.prototype.start = function (successHandler, failureHandler) {
    bluetoothle.initialize(
        // initializeSuccess,
        function (result) {
            if (result.status === "enabled") {
                console.log("Bluetooth is enabled.");
                console.log(result);
            } else {
                console.log("Bluetooth is not enabled:", "status");
                console.log(result, "status");
            }
        },
        {
            'request': true, // Should user be prompted to enable Bluetooth
            'statusReceiver': false, // false - Should change in Bluetooth status notifications be sent.
            'restoreKey' : "gopaddler-app" // A unique string to identify your app.
        }
    );
};

Bluetooth.prototype.scan = function () {
    bluetoothle.startScan(
        startScanSuccess,
        handleError,
        { services: [] }
    );
}

Bluetooth.prototype.stop = function () {
    bluetoothle.stopScan();
};

Bluetooth.prototype.getDevice = function () {

};

/**
 * Callback for bluetooth initialize
 * @param result The JSON result
 */
function initializeSuccess(result) {
    if (result.status === "enabled") {
        console.log("Bluetooth is enabled.");
        console.log(result);
    } else {
        console.log("Bluetooth is not enabled:", "status");
        console.log(result, "status");
    }
}

function handleError(error) {
    var msg;

    if (error.error && error.message) {
        var errorItems = [];
        if (error.service) {
            errorItems.push("service: " + (uuids[error.service] || error.service));
        }

        if (error.characteristic) {

            errorItems.push("characteristic: " + (uuids[error.characteristic] || error.characteristic));
        }

        msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
    }

    else {

        msg = error;
    }

    console.log(msg, "error");
}

exports.Bluetooth = Bluetooth;
