'use strict';

import Device from '../model/device';

const ERROR = {
    UNKNOWN_DEVICE_TYPE: 1
};

class Bluetooth {
    constructor() {
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
    initialize() {
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
    }

    retrieveConnected() {
        var self = this;

        return new Promise(function (resolve, reject) {
            bluetoothle.retrieveConnected(function (result) {
                var devices = [];
                for (var i = 0; i < result.length; i++) {
                    devices.push({name: result[i].name, mac: result[i].address});
                }
                resolve(devices);
            }, function (error) {
                reject(error);
            }, {services: []});
        });
    }

    startScan(onFind, onError) {
        let self = this;
        let addresss = {};
        bluetoothle.startScan(function (device) {
            if (device.status === 'scanStarted') {
                console.log('scanStarted');
                return;
            }

            if (!device.name) {
                return;
            }

            if (addresss.hasOwnProperty(device.address)) {
                return;
            }

            addresss[device.address] = true;

            console.log('new device found', device.name, device.address);

            self.listen(device.address, function success(value) {
                self.disconnect(device.address);
                onFind(new Device(device.name, device.address));
            }, function error(err) {
                console.log('listen failed', err)
            }, true);
        }, function (error) {
            onError(error);
        }, {services: []});
    }

    pair(address) {
        this.address = address;
        return new Promise(function (resolve, reject) {


            if (window.cordova.platformId === 'ios') {

                bluetoothle.connect(function success() {
                    bluetoothle.disconnect(function success(a, b, c, d) {
                    }, function error() {
                    });
                    resolve();
                }, function (error) {
                    reject(error)
                }, {address: address});


            } else {

                bluetoothle.bond(function success(result) {
                    if (result.status === 'bonded') {
                        resolve();
                    }
                }, function (error) {
                    reject(error)
                }, {address: address});
            }
        });
    }

    unpair(address) {
        this.address = address;
        return new Promise(function (resolve, reject) {


            bluetoothle.unbond(function success(result) {
                if (result.status === 'bonded')
                    resolve();
            }, function (error) {
                reject(error)
            }, {address: address});

        });
    }

    listen(address, callback, onError, singleTry) {
        const self = this;
        let connected = false;

        onError = onError || function(){};

        let errorHandler = function (context) {
            return function (err) {
                if (navigator.userAgent !== 'gp-dev-ck')
                    console.log(context, err);
                onError.apply({}, [err]);
            }
        };

        let onConnectError = errorHandler("ble::connect")
            , onDiscoverError = errorHandler("ble::discover")
            , onSubscribeError = errorHandler("ble::subscribe");

        let listen = function () {
            if (connected === true) {
                return;
            }

            let params = {address: address};
            bluetoothle.connect(function () {
                connected = true;
                bluetoothle.discover(function success(discovered) {

                    let serviceFound = false;
                    discovered.services.forEach(function (service) {
                        if (service.uuid !== self.service) {
                            return;
                        }

                        serviceFound = true;

                        let characteristicFound = false;
                        service.characteristics.forEach(function (characteristic) {
                            let characteristicUuid = characteristic.uuid;

                            if (characteristicUuid !== self.characteristic) {
                                return;
                            }

                            characteristicFound = true;
                            bluetoothle.subscribe(function (result) {
                                if (!result.value) return;
                                callback(bluetoothle.encodedStringToBytes(result.value)[1]);
                            }, onSubscribeError, {
                                address: address,
                                service: service.uuid,
                                characteristic: characteristicUuid
                            })
                        });

                        if (!characteristicFound) {
                            onDiscoverError({type: ERROR.UNKNOWN_DEVICE_TYPE});
                        }
                    });

                    if (!serviceFound) {
                        onDiscoverError({type: ERROR.UNKNOWN_DEVICE_TYPE})
                    }
                    if (navigator.userAgent !== 'gp-dev-ck')
                        console.log("discover finished");
                }, onDiscoverError, params);


            }, onConnectError, params);
        };

        if (singleTry !== true) {
            setInterval(function () {
                listen.apply(this, []);
            }, 20000);
        }
        listen();

        self.address = address;
    }

    disconnect(address) {
        var self = this;
        if (!address && self.address === null) return;

        address = address || self.address;

        bluetoothle.unsubscribe(function(){}, function(){}, {
            address: address,
            service: self.service,
            characteristic: self.characteristic
        });

        bluetoothle.close(function(){}, function(){}, {address: address});
    }

    forget(address) {
        var self = this;
        if (address === null) return;

        bluetoothle.disconnect(function(){}, function(err){console.log(err)}, {
            address: self.address
        });

        bluetoothle.close(function(){}, function(err){console.log(err)}, {address: self.address});
    }

    stopScan() {
        bluetoothle.stopScan();
    }

    close(address) {
        bluetoothle.close(function(){}, function(){}, {address: address});
    }
}


export default Bluetooth;
