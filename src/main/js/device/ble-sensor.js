'use strict';

import Device from '../model/device';
import Bluetooth from './bluetooth';
import Utils from '../utils/utils';

export default class BleSensor {
    static TYPES() {
        return Bluetooth.TYPES();
    }
    constructor(type) {

        /** @type Device[] */
        this.devices = Device.latest(type);
        this.bluetooth = new Bluetooth(type);

        this.retryTimer = null;
        this.unresponsiveTimer = null;
        this.connectedDeviceAddress = null;
    }

    listen(callback) {
        const self = this;
        clearInterval(self.retryTimer);
        clearInterval(self.unresponsiveTimer);

        if (self.devices.length === 0) {
            return;
        }

        console.log('start listening to ble, sends callback(0)');
        callback(0);

        self.lastEventAt = Date.now();
        self.bluetooth
            .initialize()
            .then(function () {
                Utils.loopAsync(self.devices, function (iterator) {
                    /**@type Device */
                    const device = iterator.current();
                    let updated = false;

                    self.bluetooth.listen(device.address, function (serviceUUID, value) {
                        iterator.finish();
                        self.connectedDeviceAddress = device.address;

                        if (updated === false) {
                            Device.updateLastSeen(device.address);
                            updated = true;

                            self.unresponsiveTimer = setInterval(function () {
                                let diff = Date.now() - self.lastEventAt;
                                if (diff > 15000) {
                                    console.log('unresponsiveTimer', diff > 15000, diff, new Date(self.lastEventAt));
                                    callback(0);
                                }
                            }, 5000);
                        }

                        self.lastEventAt = Date.now();
                        callback(value);
                    }, function onError() {
                        console.log('failed', device.address);
                        self.bluetooth.disconnect(device.address);

                        if (iterator.isFinished()) {

                            setTimeout(function(){
                                iterator.restart();
                                iterator.next();
                            }, 60000);

                            return;
                        }

                        iterator.next();
                    }, /* retry 3 times = */ 3);
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
    }

    stop() {
        const self = this;
        self.bluetooth.disconnect(self.connectedDeviceAddress);
        clearInterval(self.unresponsiveTimer);
        clearInterval(self.retryTimer);
    }
}
