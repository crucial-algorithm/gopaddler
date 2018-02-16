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
    };

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

Bluetooth.prototype.retrieveConnected = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        bluetoothle.retrieveConnected(function (result) {
            for (var i = 0; i < result.length; i++) {
                resolve({name: result[i].name, mac: result[i].address});
            }

            self.startScan().then(resolve).catch(reject);

        }, function (error) {
            reject(error);
        }, {services: []});
    });
};

Bluetooth.prototype.startScan = function () {
    return new Promise(function (resolve, reject) {
        bluetoothle.startScan(function (result) {
            if (result.status === 'scanStarted'){
                console.log('scanStarted');
                return;
            }

            if (!result.name) return;

            console.log('new device found', result.name, result.address);
            resolve({name: result.name, mac: result.address});
        }, function (error) {
            reject(error);
        }, {services: []});
    });
}

Bluetooth.prototype.pair = function (address) {
    return new Promise(function (resolve, reject) {

        bluetoothle.connect(function success(a, b, c, d) {
            console.log(a, b, c, d);
            bluetoothle.disconnect(function success(a, b, c, d) {
                console.log(a, b, c, d);
            }, function error() {
            });
            resolve();
        }, function (error) {
            reject(error)
        }, {address: address});

    });
};

Bluetooth.prototype.listen = function (address, callback) {
    var self = this;
    var error = function (err) {
        console.log(err)
    };


    var params = {address: address};
    bluetoothle.connect(function () {

            bluetoothle.discover(function success(discovered) {

                discovered.services.forEach(function (service) {

                        var serviceUuid = service.uuid;

                        service.characteristics.forEach(
                            function (characteristic) {
                                var characteristicUuid = characteristic.uuid;

                                if (characteristicUuid !== "2A37") {
                                    return;
                                }

                                bluetoothle.subscribe(function (result) {
                                    console.log('subscribe', result);
                                    callback(bluetoothle.encodedStringToBytes(result.value)[1]);
                                }, error, {
                                    address: address,
                                    service: serviceUuid,
                                    characteristic: characteristicUuid
                                })
                            })
                    }
                );
            }, error, params);
        },
        function (error) {
            console.log('bluetoothle connection error', error);
            self.disconnect();
            self.listen(address, callback);
        }, params);
};

Bluetooth.prototype.disconnect = function (address) {
    bluetoothle.unsubscribe(function(){}, function(){}, {
        address: address,
        service: "180D",
        characteristic: "2A37"
    });
    bluetoothle.disconnect(function(){}, function(){}, {
        address: address
    });
    bluetoothle.close(function(){}, function(){}, {address: address});
};

Bluetooth.prototype.stopScan = function () {
    bluetoothle.stopScan();
};

exports.Bluetooth = Bluetooth;
