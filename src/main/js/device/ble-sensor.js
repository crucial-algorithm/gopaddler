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
        this.type = type;
    }

    async listen(callback) {
        const self = this;
        clearInterval(self.retryTimer);
        clearInterval(self.unresponsiveTimer);

        if (self.devices.length === 0) {
            return;
        }

        console.log('start listening to ble, sends callback(0)', this.type, this.devices);
        callback(0);

        self.lastEventAt = Date.now();
        try {
            await self.bluetooth.initialize();
            console.log('ble is ready', this.type, this.devices);

            Utils.loopAsync(self.devices, function (iterator) {
                /**@type Device */
                const device = iterator.current();
                let updated = false;
                const uuid = Utils.guid();
                console.log(`[${uuid}] attempt to connect to ${device.name} (${device.address})`);

                self.bluetooth.listen(device, function (value) {
//                    console.log(`[${uuid}] connected to ${device.name} (${device.address})`);
                    iterator.finish();
                    self.connectedDeviceAddress = device.address;

                    if (updated === false) {
                        Device.updateLastSeen(device.address);
                        updated = true;

                        clearInterval(self.unresponsiveTimer);
                        self.unresponsiveTimer = setInterval(function () {
                            let diff = Date.now() - self.lastEventAt;
                            if (diff > 15000) {
                                console.log('unresponsiveTimer', uuid, diff > 15000, diff, new Date(self.lastEventAt));
                                callback(0);
                            }
                        }, 5000);
                    }

                    self.lastEventAt = Date.now();
                    callback(value);
                }, function onError(err) {
                    console.log(`[${uuid}] failed to connect to ${device.name} (${device.address})`, err);

                    if (iterator.isFinished()) {

                        setTimeout(function(){
                            console.log(`[${uuid}] no more devices of this type... restarting process ${device.name} (${device.address})`, err);
                            iterator.restart();
                            iterator.next();
                        }, 20000);

                        return;
                    }

                    iterator.next();
                }, /* retry 3 times = */ 3);
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

    stop() {
        const self = this;
        clearInterval(self.unresponsiveTimer);
        clearInterval(self.retryTimer);
        self.bluetooth.disconnect(self.connectedDeviceAddress)
            .then(() => console.log('disconnected', this.type))
            .catch((err) => console.error(err));
    }
}
