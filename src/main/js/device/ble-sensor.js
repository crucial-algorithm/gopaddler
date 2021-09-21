'use strict';

import Device from '../model/device';
import Bluetooth from './bluetooth';

export default class BleSensor {
    static TYPES() {
        return Bluetooth.TYPES();
    }

    constructor(type, retryTimeOuts = [60]) {

        this.bluetooth = new Bluetooth(type);
        this.active = false;

        /**@type Device */
        this.connectedDevice = null;
        this.type = type;
        this._isSessionPaused = false;
        this._reconnectRetryTimeOuts = retryTimeOuts;
        this._reconnectTimeOut = -1;

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
        if (!this.active) throw new Error('sensor not listening');
        if (this.isSessionPaused) throw new Error('won\'t connect while paused');
        console.log(`... connecting to ${device.address}`);
        return this.subscribe(device, this.listenerCallback, () => {
            setTimeout( () => this.startReconnectionLoop(device), 10000)
        })
    }

    async startReconnectionLoop(device) {
        try {
            await this.connectTo(device);
            console.log(`reconnected successfully to ${device.address}`)
        } catch(err) {
            console.log(`reconnected to ${device.address} failed. Retry in ${this.reconnectRetryTimeOuts[0]} secs`)
            if (this.reconnectRetryTimeOuts.length === 0) {
                console.log(`giving up reconnect to ${device.address}`);
                return;
            }
            this.reconnectTimeOut = setTimeout(() => {
                this.startReconnectionLoop(device);
            }, this.isSessionPaused ? 10000 :
                // We should reset the array... this way we will consume retries throughout the session
                // Whoever, given we are not doing that while sessino is pause, it's unlikely we are going
                // to run into problem because of that
                this.reconnectRetryTimeOuts.shift() * 1000
            );
        }
    }

    /**
     *
     * @param {Device} device
     * @param callback
     * @param [onDeviceDisconnected]
     * @returns {Promise<unknown>}
     */
    subscribe(device, callback, onDeviceDisconnected = () => {}) {
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
                            // console.log(`BLE: Unresponsive Timer triggered; ${diff} | Last ${new Date(this.lastEventAt)}`);
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
            }, onDeviceDisconnected);
        })
    }

    stop() {
        this.active = false;
        if (this.connectedDevice === null) return
        this.bluetooth.disconnect(this.connectedDevice.address)
            .then(() => console.log('disconnected', this.type))
            .catch((err) => console.error(err));
        clearTimeout(this.reconnectTimeOut)
    }

    get reconnectRetryTimeOuts() {
        return this._reconnectRetryTimeOuts;
    }

    set reconnectRetryTimeOuts(value) {
        this._reconnectRetryTimeOuts = value;
    }

    get reconnectTimeOut() {
        return this._reconnectTimeOut;
    }

    set reconnectTimeOut(value) {
        this._reconnectTimeOut = value;
    }


}
