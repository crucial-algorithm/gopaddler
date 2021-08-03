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
        /**@type Device */
        this.connectedDevice = null;
        this.type = type;
    }

    async listen(callback) {
        const self = this;
        clearInterval(self.retryTimer);
        clearInterval(self.unresponsiveTimer);
        self.originalCallback = callback;

        if (self.devices.length === 0) {
            return;
        }

        console.log('start listening to ble, sends callback(0)', this.type, this.devices);
        callback(0);

        self.lastEventAt = Date.now();
        try {
            await self.bluetooth.initialize();
            console.log('ble is ready', this.type, this.devices);

            Utils.loopAsync(self.devices, async function (iterator) {
                /**@type Device */
                const device = iterator.current();
                const uuid = Utils.guid();
                console.log(`[${uuid}] attempt to connect to ${device.name} (${device.address})`);
                try {
                    await self.subscribe(device, callback, true)
                } catch (err) {
                    if (iterator.isFinished()) {
                        setTimeout(function(){
                            console.log(`[${uuid}] no more devices of this type... restarting process ${device.name} (${device.address})`, err);
                            iterator.restart();
                            iterator.next();
                        }, 20000);

                        return;
                    }
                    iterator.next();
                }
            });

        } catch (err) {
            if (err.reason !== 'disabled') {
                return;
            }

            self.retryTimer = setInterval(function () {
                self.listen(callback);
            }, 30000);
        }
    }

    /**
     *
     * @param {Device} device
     * @param callback
     * @param discover
     * @returns {Promise<unknown>}
     */
    subscribe(device, callback, discover = true) {
        const self = this;
        return new Promise((resolve, reject) => {
            let updated = false;
            self.bluetooth.listen(device, function (value) {
                self.connectedDevice = device;
                if (updated === false) {
                    Device.updateLastSeen(device.address);
                    updated = true;

                    clearInterval(self.unresponsiveTimer);
                    self.unresponsiveTimer = setInterval(function () {
                        let diff = Date.now() - self.lastEventAt;
                        if (diff > 15000) {
                            console.log('unresponsiveTimer', diff > 15000, diff, new Date(self.lastEventAt));
                            callback(0, true);
                        }
                    }, 5000);
                }

                self.lastEventAt = Date.now();
                callback(value);
                resolve()
            }, function onError(err) {
                reject(err)
                console.log(`[failed to connect to ${device.name} (${device.address})`, err);
            }, /* retry 3 times = */ 3, discover);
        })
    }

    stop() {
        const self = this;
        clearInterval(self.unresponsiveTimer);
        clearInterval(self.retryTimer);
        if (self.connectedDevice === null) return
        self.bluetooth.disconnect(self.connectedDevice.address)
            .then(() => console.log('disconnected', this.type))
            .catch((err) => console.error(err));
    }

    restore() {
        this.subscribe(this.connectedDevice, this.originalCallback).then(() => {
            console.log('connection restored')
        }).catch((err) => {
            console.log('failed to reconnect to device')
            console.error(err)
        })
    }
}
