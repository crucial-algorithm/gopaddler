'use strict';

import Device from '../model/device';
import Bluetooth from './bluetooth';
import Utils from '../utils/utils';

const RETRY_TIMER_BOUNCE_BACK_SECONDS = [
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, // 00 to 5'  | every 30''
    60, 60, 60, 60, 60, 60,                 // up to 10' | every 1'
    300, 300, 300, 300, 300, 300            // up to 40' | every 5'
]

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
        this._isSessionPaused = false;
    }
    
    pause() {
        this.isSessionPaused = true;
    }
    
    resume() {
        this.isSessionPaused = false;
    }
    
    get isSessionPaused() {
        return this._isSessionPaused;
    }
    
    set isSessionPaused(isPaused) {
        this._isSessionPaused = isPaused;
    }

    async listen(callback) {
        clearInterval(this.retryTimer);
        clearInterval(this.unresponsiveTimer);

        if (this.devices.length === 0) {
            return;
        }

        console.log('start listening to ble, sends callback(0)', this.type, this.devices);
        callback(0);

        this.lastEventAt = Date.now();
        try {
            await this.bluetooth.initialize();
            console.log('ble is ready', this.type, this.devices);
            const availableDevices = await this.bluetooth.availableDevices(this.devices, this.type);
            console.log('scan to awake devices finished')

            Utils.loopAsync(this.devices, async (iterator) => {
                /**@type Device */
                const device = iterator.current();
                const uuid = Utils.guid();
                console.log(`[${uuid}] attempt to connect to ${device.name} (${device.address})`);
                try {
                    if (availableDevices.indexOf(device.address) < 0) {
                        throw new Error(`Device ${device.address} not available`)
                    }
                    await this.subscribe(device, callback);
                    console.log(`[${uuid}] subscribed ${device.name} (${device.address})`);
                    // only connect to a device of a type
                    iterator.finish();
                } catch (err) {
                    console.error(err)
                    if (iterator.isFinished()) {
                        setTimeout(() => {
                            console.log(`[${uuid}] no more devices of this type... restarting process ${device.name} (${device.address})`, err);
                            iterator.restart();
                            iterator.next();
                        }, RETRY_TIMER_BOUNCE_BACK_SECONDS.unshift() * 1000);

                        return;
                    }
                    iterator.next();
                }
            });

        } catch (err) {
            if (err.reason !== 'disabled') {
                return;
            }

            this.retryTimer = setInterval(() => {
                this.listen(callback);
            }, RETRY_TIMER_BOUNCE_BACK_SECONDS.pop() * 1000);
        }
    }

    /**
     *
     * @param {Device} device
     * @param callback
     * @returns {Promise<unknown>}
     */
    subscribe(device, callback) {
        return new Promise((resolve, reject) => {
            let updated = false, listened = false, timedOut = false;
            const timeout = setTimeout(() => {
                if (listened === true) return
                console.log(`[timed out connection to ${device.name} (${device.address})`);
                timedOut = true
                reject()
            }, 20000)
            this.bluetooth.listen(device, (value) => {
                if (timedOut) return;
                listened = true;
                clearTimeout(timeout);

                this.connectedDevice = device;
                if (updated === false) {
                    Device.updateLastSeen(device.address);
                    updated = true;

                    clearInterval(this.unresponsiveTimer);
                    this.unresponsiveTimer = setInterval( async () => {
                        if (this.isSessionPaused) {
                            callback(0);
                            return
                        }
                        let diff = Date.now() - this.lastEventAt;
                        if (diff > 15000) {
                            console.log(`BLE: Unresponsive Timer triggered; ${diff} | Last ${new Date(this.lastEventAt)}`);
                            callback(0);
                            await this.restore(device, callback);
                        }
                    }, 5000);
                }

                this.lastEventAt = Date.now();
                callback(value);
                resolve()
            }, function onError(err) {
                if (!timedOut) reject(err)
                clearTimeout(timeout);
                console.log(`[failed to connect to ${device.name} (${device.address}) ${timedOut ? ' (previously timed out)' : ''}`, err);
            }, /* retry 3 times = */ 3);
        })
    }

    stop() {
        clearInterval(this.unresponsiveTimer);
        clearInterval(this.retryTimer);
        if (this.connectedDevice === null) return
        this.bluetooth.disconnect(this.connectedDevice.address)
            .then(() => console.log('disconnected', this.type))
            .catch((err) => console.error(err));
    }

    /**
     *
     * @param {Device} device
     * @param {function} callback
     */
    async restore(device, callback) {
        if (this.isSessionPaused) return;
        try {
            await this.bluetooth.disconnect(device.address)
        } catch (err) {
            console.error(`failed to disconnect during restore connection. ${err.message}`)
        }
        this.subscribe(device, callback).then(() => {
            console.log('connection restored')
        }).catch((err) => {
            console.log('failed to reconnect to device')
            console.error(err)
        })
    }
}
