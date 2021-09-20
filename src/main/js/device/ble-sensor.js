'use strict';

import Device from '../model/device';
import Bluetooth from './bluetooth';

export default class BleSensor {
    static TYPES() {
        return Bluetooth.TYPES();
    }
    constructor(type) {

        this.bluetooth = new Bluetooth(type);
        this.active = false;

        /**@type Device */
        this.connectedDevice = null;
        this.type = type;
        this._isSessionPaused = false;

        this.listenerCallback = () => {}
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
        this.active = true;
        callback(0);
        this.listenerCallback = callback;
    }

    async connectTo(device) {
        if (!this.active) throw new Error('sensor not listening')
        console.log(`... connecting to ${device.address}`);
        return this.subscribe(device, this.listenerCallback)
    }

    /**
     *
     * @param {Device} device
     * @param callback
     * @returns {Promise<unknown>}
     */
    subscribe(device, callback) {
        return new Promise((resolve, reject) => {
            let updated = false;
            this.bluetooth.listen(device, (value) => {
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
                        }
                    }, 5000);
                }

                this.lastEventAt = Date.now();
                callback(value);
                resolve()
            }, function onError(err) {
                reject(err)
                console.log(`[failed to connect to ${device.name} (${device.address})`, err);
            });
        })
    }

    stop() {
        this.active = false;
        if (this.connectedDevice === null) return
        this.bluetooth.disconnect(this.connectedDevice.address)
            .then(() => console.log('disconnected', this.type))
            .catch((err) => console.error(err));
    }
}
