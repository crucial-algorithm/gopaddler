'use strict';

function Bluetooth () {
    var self = this;
    self.foundDevices = [];
    self.uuids = {};
    self.address = null;
    self.characteristic = "2A37";
    self.service = "180D";
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
                resolve()
            }
            reject({reason: result.status});
        }, params);
    });
};

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
    var addresss = {};
    return new Promise(function (resolve, reject) {
        bluetoothle.startScan(function (result) {
            if (result.status === 'scanStarted'){
                console.log('scanStarted');
                return;
            }

            if (!result.name) return;

            if (addresss.hasOwnProperty(result.address)) return;

            addresss[result.address] = true;

            console.log('new device found', result.name, result.address);
            resolve({name: result.name, mac: result.address});
        }, function (error) {
            reject(error);
        }, {services: []});
    });
};

Bluetooth.prototype.pair = function (address) {
    this.address = address;
    return new Promise(function (resolve, reject) {
        bluetoothle.connect(function success() {
            bluetoothle.disconnect(function success(a, b, c, d) {
            }, function error() {
            });
            resolve();
        }, function (error) {
            reject(error)
        }, {address: address});

    });
};

Bluetooth.prototype.listen = function (address, callback) {
    var self = this
        , connected = false;
    var error = function (err) {
        console.log(err)
    };

    var listen = function () {
        if (connected === true) return;

        var params = {address: address};
        bluetoothle.connect(function () {
            connected = true;
            bluetoothle.discover(function success(discovered) {

                discovered.services.forEach(function (service) {

                        var serviceUuid = service.uuid;

                        service.characteristics.forEach(
                            function (characteristic) {
                                var characteristicUuid = characteristic.uuid;

                                if (characteristicUuid !== self.characteristic) {
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
            connected = false;
        }, params);
    };

    setInterval(function () {
        listen.apply(this, []);
    }, 20000);
    listen();

    self.address = address;
};

Bluetooth.prototype.disconnect = function () {
    var self = this;
    if (self.address === null) return;

    bluetoothle.unsubscribe(function(){}, function(){}, {
        address: self.address,
        service: self.service,
        characteristic: self.characteristic
    });
    bluetoothle.disconnect(function(){}, function(){}, {
        address: self.address
    });
    bluetoothle.close(function(){}, function(){}, {address: self.address});
};

Bluetooth.prototype.stopScan = function () {
    bluetoothle.stopScan();
};

exports.Bluetooth = Bluetooth;
