'use strict';

import Device from '../model/device';
import Bluetooth from './bluetooth';

const utils = require('../utils/utils');

class HeartRateSensor {
    constructor() {

        /** @type Device[] */
        this.devices = Device.latest();
        this.bluetooth = new Bluetooth();

        this.heartRate = 0;
        this.lastEventAt = null;
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
                    /**@type Device */
                    const device = iterator.current();
                    let updated = false;

                    self.bluetooth.listen(device.address, function (hr) {
                        iterator.finish();
                        self.connectedDeviceAddress = device.address;

                        if (updated === false) {
                            Device.updateLastSeen(device.address);
                            updated = true;
                        }

                        self.lastEventAt = Date.now();
                        callback(hr);
                    }, function onError() {

                        self.bluetooth.disconnect(device.address);

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
    }

    stop() {
        const self = this;
        self.bluetooth.disconnect(self.connectedDeviceAddress);
        clearInterval(self.unresponsiveTimer);
        clearInterval(self.retryTimer);
    }
}

export default HeartRateSensor;
