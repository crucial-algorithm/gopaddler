'use strict';

function Bluetooth () {
    var self = this;

    self.isEnabled = false;
    self.foundDevices = [];
    self.uuids = {};
    self.value = 0;
}

/**
 * @return {Promise} Resolve if the bluetooth sucessfully enabled, reject otherwise
 */
Bluetooth.prototype.initialize = function () {
    var params = {
        "request": true,
        "statusReceiver": true,
        "restoreKey" : "gopaddler-app"
    }

    return new Promise(function (resolve, reject) {
        bluetoothle.initialize(function (result) {
            if (result.status === "enabled") {
                self.isEnabled = true;
                resolve()
            }
            reject();
        }, params);
    });
}

Bluetooth.prototype.startScan = function () {
    return new Promise(function (resolve, reject) {
        bluetoothle.startScan(function (result) {
            if (result.status === 'scanStarted'){
                console.log('scanStarted');

                return;
            }

            console.log('new device found' + result);
            resolve(result.name, result.address);
        }, function (error) {
            reject();
        }, {services: []});
    });
}

Bluetooth.prototype.retrieveConnected = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        bluetoothle.retrieveConnected(function (result) {
            if (result.length === 0) {
                self.startScan().then(resolve).catch(reject);

                setTimeout(function () {
                    self.stopScan();
                }, 60);

                return;
            }

            for (var i = 0; i < result.length; i++) {
                resolve(result[i].name, result[i].address);
            }
        }, function (error) {
            reject();
        }, {services: []});
    });
}

/**
 * @param {array} The list of devices to search for
 */
Bluetooth.prototype.searchFor = function (devices, callback) {
    var params = {
        "services": devices
    };

    return new Promise(function (resolve, reject) {
        bluetoothle.retrieveConnected(function (result) {
            console.log(result);

            var params = {"address" : result[0].address}

            bluetoothle.connect(function (status) {
                console.log(status);

                var params = {address: status.address};

                bluetoothle.discover(function (discovered) {
                    console.log(discovered);
                    discovered.services.forEach(
                        function (service) {

                            var serviceUuid = service.uuid;

                            service.characteristics.forEach(
                                function (charateristic) {
                                    var charateristicUuid = charateristic.uuid;

                                    if (charateristicUuid !== "2A37") {
                                        return;
                                    }

                                    var params = {address: discovered.address, service: serviceUuid, characteristic: charateristicUuid};
                                    bluetoothle.subscribe(function (result2) {
                                        console.log(result2);

                                        var x = bluetoothle.encodedStringToBytes(result2.value);

                                        callback(x[1]);
                                    }, function (error) {
                                        console.log(error);
                                    }, params)
                                })
                        }
                    );
                }, function (error) {
                    console.log(error);
                }, params);
            }, function (error) {
                console.log(error);
            }, params);
            resolve();
        }, function (error) {
            reject();
        }, params);
    });
}

function startScanSuccess(result) {
    var self = this;
    console.log("startScanSuccess(" + result.status + ")");

    if (result.status === "scanStarted") {
        console.log("Scanning for devices (will continue to scan until you select a device)...", "status");
    } else if (result.status === "scanResult") {

            console.log('FOUND DEVICE:');
            console.log(result);
            connect(result.address);
    }
}

function connect(address) {
    console.log('Connecting to device: ' + address + "...", "status");

    stopScan();

    new Promise(function (resolve, reject) {
        bluetoothle.connect(resolve, reject, { address: address });
    }).then(connectSuccess.bind(this), handleError.bind(this));
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
                        { address: result.address, service: service, characteristics: [] });

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
    var self = this;

    console.log("readSuccess():");
    console.log(result);
    var bytes = bluetoothle.encodedStringToBytes(result.value);
    var string = bluetoothle.bytesToString(bytes); //This should equal Write Hello World

    console.log(string);
}

function stopScanSuccess() {
    var self = this;

    if (!self.foundDevices.length) {

        console.log("NO DEVICES FOUND");
    }
    else {

        console.log("Found " + self.foundDevices.length + " devices.", "status");
    }
}

Bluetooth.prototype.isEnabled = function () {
    return new Promise(function (resolve, reject) {
        bluetoothle.isEnabled(function (result) {
            result.status === "enabled" ? resolve() : reject();
        });
    });
};

Bluetooth.prototype.start = function () {
    var self  = this;

    return new Promise(function (resolve, reject) {

        bluetoothle.initialize(
            // initializeSuccess,
            function (result) {
                if (result.status === "enabled") {
                    resolve(result);
                } else {
                    reject(result);
                }
            },
            {
                'request': true, // Should user be prompted to enable Bluetooth
                'statusReceiver': true, // true - Should change in Bluetooth status notifications be sent.
                'restoreKey': "gopaddler-app" // A unique string to identify your app.
            }
        );
    });
};

Bluetooth.prototype.listen = function (callback) {
    var self = this;

    self.start().then(function () {
        // bluetooth enabled
        console.log('bluetooth enabled, ready to scan for devices');

        self.scan();
        callback(self.value);

    }).catch(function () {
        // bluetooth disabled
        console.log('bluetooth disabled');
    })
};


Bluetooth.prototype.scan = function () {
    var self = this;
    bluetoothle.startScan(
        startScanSuccess.bind(self),
        handleError.bind(self),
        { services: ['180D'] }
    );
};

Bluetooth.prototype.stopScan = function () {
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
    var self = this, msg;

    if (error.error && error.message) {
        var errorItems = [];
        if (error.service) {
            // errorItems.push("service: " + (self.uuids[error.service] || error.service));
        }

        if (error.characteristic) {

            // errorItems.push("characteristic: " + (self.uuids[error.characteristic] || error.characteristic));
        }

        msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
    }

    else {

        msg = error;
    }

    console.log(msg, "error");
}

exports.Bluetooth = Bluetooth;
