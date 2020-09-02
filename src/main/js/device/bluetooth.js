'use strict';

import Device from '../model/device';


/**
 * @typedef {Object} BleCharacteristic
 * @property {String} uuid
 */

/**
 * @typedef {Object} BleService
 * @property {String} uuid
 * @property {Array<BleCharacteristic>} characteristics
 */

/**
 * @typedef {Object} CrankRevolutionData
 * @property {Number} cumulativeCrankRevolutions
 * @property {Number} lastCrankEventTime
 * @property {Number} crankTimeDiff
 * @property {Number} crankDiff
 * @property {Number} cadence
 * @property {Number} recordedAt
 */

const ERROR = {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    UNKNOWN_DEVICE_TYPE: 'UNKNOWN_DEVICE_TYPE',
    CONNECT_ERROR: 'CONNECT_ERROR',
    SUBSCRIBE_ERROR: 'SUBSCRIBE_ERROR'
};

const BLE_PROFILES = {
    CYCLING_CADENCE: {
        SERVICE_UUID: "1816",
        CHARACTERISTIC_UUID: "2A5B",
        METRIC_POSITION: 2
    },

    HR: {
        SERVICE_UUID: "180D",
        CHARACTERISTIC_UUID: "2A37",
        METRIC_POSITION: 1
    }
};
const SERVICES = [BLE_PROFILES.HR.SERVICE_UUID, BLE_PROFILES.CYCLING_CADENCE.SERVICE_UUID];
const CHARACTERISTICS = [BLE_PROFILES.HR.CHARACTERISTIC_UUID, BLE_PROFILES.CYCLING_CADENCE.CHARACTERISTIC_UUID];

const UINT16_MAX = 65536;  // 2^16

let isBluetoothInitialized = false;

class Bluetooth {

    static TYPES() {
        return {HR: 'HR', CYCLING_CADENCE: 'CYCLING_CADENCE'};
    }

    constructor(type = 'HR') {
        this.foundDevices = [];
        this.uuids = {};
        this.address = null;
        const profile = BLE_PROFILES[type];
        this.service = profile.SERVICE_UUID;
        this.characteristic = profile.CHARACTERISTIC_UUID;
        /**@type CyclingCadenceMetricCalculator */
        this._cyclingCandenceCalculator = null;
        this._wasDisconnectIssued = false;
    }

    /**
     * @return {Promise} Resolve if the bluetooth successfully enabled, reject otherwise
     */
    initialize() {
        let params = {
            "request": true,
            "statusReceiver": true,
            "restoreKey": "gopaddler-app"
        };

        return new Promise(function (resolve, reject) {
            if (isBluetoothInitialized) {
                console.log('ble initalized... resolve');
                setTimeout(() => resolve(), 20);
            } else {

                console.log('initializing ble');
                bluetoothle.initialize(function (result) {
                    if (result.status === "enabled") {
                        isBluetoothInitialized = true;
                        resolve();
                    }
                    reject({reason: result.status});
                }, params);
            }
        });
    }

    startScan(onFind, onError) {
        let self = this;
        let addresss = {};
        bluetoothle.startScan(async function (device) {

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

            try {
                const deviceInfo = await self.evaluateDeviceFoundOnScan(device.address);
                const now = Date.now();
                const type = deviceInfo.service.uuid === BLE_PROFILES.CYCLING_CADENCE.SERVICE_UUID ? "CYCLING_CADENCE" : "HR";
                onFind(new Device(device.name, device.address, type, deviceInfo.service.uuid
                    , deviceInfo.characteristic.uuid, now, now));
            } catch (err) {
                console.error('failed to connect to scanned device', err);
            }

        }, function (error) {
            onError(error);
        }, {services: SERVICES});
    }

    stopScan() {
        bluetoothle.stopScan();
    }

    /**
     * Evaluate if this device is relevant to us
     * @private
     *
     * @param address
     * @return {Promise<{address: string, service: BleService, characteristic: BleCharacteristic}>}
     */
    async evaluateDeviceFoundOnScan(address) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            try {
                await self.connect(address);
                let info = await self.discover(address);
                self.subscribeCharacteristic(address, info.service.uuid, info.characteristic.uuid, () => {
                    self.disconnect(address);
                    resolve(info);
                }, (err) => {
                    reject({type: ERROR.SUBSCRIBE_ERROR, error: err});
                });
            } catch (err) {
                reject({type: ERROR.CONNECT_ERROR, error: err});
            }
        });
    }

    /**
     * @private
     * @param address
     * @return {Promise<unknown>}
     */
    async connect(address) {
        const self = this;
        return new Promise((resolve, reject) => {
            bluetoothle.connect(function () {
                resolve();
            }, function (err) {
                console.log('something wrong with the connection to ', address, err);
                if (err.message === "Device previously connected, reconnect or close for new device") {
                    self.disconnect(address).then(resolve);
                }
                reject(err);
            }, {
                address: address,
                autoConnect: true
            });
        });
    }

    /**
     * @private
     * @param address
     * @return {Promise<{address: string, service: BleService, characteristic: BleCharacteristic}>}
     */
    async discover(address) {
        const self = this;
        return new Promise((resolve, reject) => {
            bluetoothle.discover(function success(discovered) {

                let service = self.scanServices(discovered.services);
                // noinspection JSIncompatibleTypesComparison
                if (service === null) return reject({type: ERROR.UNKNOWN_DEVICE_TYPE});

                let characteristic = self.scanCharacteristics(service.characteristics);
                // noinspection JSIncompatibleTypesComparison
                if (characteristic === null) return reject({type: ERROR.UNKNOWN_DEVICE_TYPE});

                resolve({address, service, characteristic});

                if (navigator.userAgent !== 'gp-dev-ck')
                    console.log("discover complete", address);

            }, (err) => {
                if (err.error === "neverConnected") {
                    // try to reconnect
                    self.evaluateDeviceFoundOnScan(address);
                } else {
                    reject({type: ERROR.UNKNOWN_ERROR, error: err});
                }
            }, {
                address: address
            });
        });
    }

    /**
     *
     * @param {Device} device
     * @param callback
     * @param onError
     * @param attemptsLimit
     */
    async listen(device, callback, onError, attemptsLimit = 1) {
        const self = this;
        const address = device.address;
        try {
            await self.connect(address);
            console.log(`ble connection established ${device.name} (${device.address})`);
            await self.discover(address);
            console.log(`ble descovery finished established ${device.name} (${device.address})`);
            self.subscribeCharacteristic(address, device.serviceUuid, device.characteristicUuid, (value) => {
                callback.apply({}, [value]);
            }, (err) => {
                self.disconnect(device.address);
                onError({type: ERROR.SUBSCRIBE_ERROR, error: err});
            });
        } catch (err) {
            onError({type: ERROR.CONNECT_ERROR, error: err});
        }

        self.address = address;
    }



    /**
     * Subscribe to characteristic
     * @param address
     * @param serviceUUID
     * @param characteristicUUID
     * @param listener
     * @param onSubscribeError
     */
    subscribeCharacteristic(address, serviceUUID, characteristicUUID, listener, onSubscribeError) {
        const self = this;
        bluetoothle.subscribe(function (result) {
            if (!result.value) return;
            listener(self.decode(serviceUUID, result.value));
        }, onSubscribeError, {
            address: address,
            service: serviceUUID,
            characteristic: characteristicUUID
        });
    }

    /**
     * @private
     *
     * @param {Array<BleService>} services
     * @return {BleService|null}
     */
    scanServices(services) {
        let result = null;
        for (let service of services) {
            if (SERVICES.indexOf(service.uuid) < 0) continue;
            result = service;
        }
        return result;
    }

    /**
     * @private
     * @param {Array<BleCharacteristic>} characteristics
     * @return {BleCharacteristic|null}
     */
    scanCharacteristics(characteristics) {
        /** @type BleCharacteristic|null */
        let result = null;
        for (let characteristic of characteristics) {
            if (CHARACTERISTICS.indexOf(characteristic.uuid) < 0) continue;
            result = characteristic;
        }
        return result;
    }

    /**
     * Decode value to extract metric from sensor retrieved data
     *
     * @param {String} serviceUuid
     * @param {String} value raw value from sensor
     * @return {number}
     */
    decode(serviceUuid, value) {
        if (serviceUuid === BLE_PROFILES.CYCLING_CADENCE.SERVICE_UUID) {
            if (this._cyclingCandenceCalculator === null)
                this._cyclingCandenceCalculator = new CyclingCadenceMetricCalculator();
            return this._cyclingCandenceCalculator.decode(value);
        } else {
            return bluetoothle.encodedStringToBytes(value)[1];
        }
    }

    disconnect(address) {
        let self = this;
        this._wasDisconnectIssued = true;
        return new Promise((reject, resolve)=>{
            if (!address && self.address === null) return;

            address = address || self.address;

            bluetoothle.close(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, {address: address});
        })
    }

    forget(address) {
        let self = this;
        if (address === null) return;

        bluetoothle.disconnect(function () {
        }, function (err) {
            console.log(err)
        }, {
            address: self.address
        });

        bluetoothle.close(function () {
        }, function (err) {
            console.log(err)
        }, {address: self.address});
    }

    close(address) {
        bluetoothle.close(function () {
        }, function () {
        }, {address: address});
    }
}

class CyclingCadenceMetricCalculator {
    constructor() {
        this._previousCumulativeCrankRevolutions = null;
        this._previouCrankEventTime = null;
        this._records = [];
    }

    /**
     *
     * @param value
     * @return {number}
     */
    decode(value) {
        let bytes = bluetoothle.encodedStringToBytes(value);
        let flag = bytes[0];
        // must be equal to 2 to have cadence
        let cumulativeCrankRevolutions = this.convertTo16bits(bytes.buffer, 1);
        let lastCrankEventTime = this.convertTo16bits(bytes.buffer, 3);

        if (this._previouCrankEventTime === null) {
            this._previousCumulativeCrankRevolutions = cumulativeCrankRevolutions;
            this._previouCrankEventTime = lastCrankEventTime;
            return 0;
        }

        let crankTimeDiff = this.diffForSample(lastCrankEventTime, this._previouCrankEventTime, UINT16_MAX);
        crankTimeDiff /= 1024; // Convert from fractional seconds (roughly ms) -> full seconds
        let crankDiff = this.diffForSample(cumulativeCrankRevolutions, this._previousCumulativeCrankRevolutions, UINT16_MAX);

        this._previousCumulativeCrankRevolutions = cumulativeCrankRevolutions;
        this._previouCrankEventTime = lastCrankEventTime;

        let cadence = (crankTimeDiff === 0) ? 0 : (60 * crankDiff / crankTimeDiff); // RPM
        if (cadence === 0 || cadence < 1) {
            console.log(`cumulativeCrankRevolutions: ${previous.cumulativeCrankRevolutions} / ${cumulativeCrankRevolutions}; lastCrankEventTime: ${previous.lastCrankEventTime} / ${lastCrankEventTime}; crankTimeDiff: ${previous.crankTimeDiff} / ${crankTimeDiff}; crankDiff: ${previous.crankDiff} / ${crankDiff}; RPM: ${previous.cadence} / ${cadence}`);
        }

        cadence = Math.round(cadence);
        return this.cadence({
            cumulativeCrankRevolutions: cumulativeCrankRevolutions,
            lastCrankEventTime: lastCrankEventTime,
            crankTimeDiff: crankTimeDiff,
            crankDiff: crankDiff,
            cadence: cadence,
            recordedAt: Date.now()
        })
    }

    /**
     *
     * @param buffer
     * @param start
     * @return {number}
     */
    convertTo16bits(buffer, start) {
        let u16bytesHr = buffer.slice(start, start + 2);
        return new Uint16Array(u16bytesHr)[0];
    }

    diffForSample(current, previous, max) {
        if (current >= previous) {
            return current - previous;
        } else {
            return (max - previous) + current;
        }
    }

    /**
     *
     * @param {CrankRevolutionData} record
     * @return {Number}
     */
    cadence(record) {
        this._records.push(record);
        if (this._records.length > 5) {
            this._records.shift();
        }

        if (this._records.length < 5)
            return 0;

        if (record.cadence > 0) return record.cadence;

        for (let i = this._records.length - 1; i >= 0; i--) {
            record = this._records[i];
            if (record.cadence > 0 && Date.now() - record.recordedAt < 5000) return record.cadence;
        }
        return 0
    }
}

let previous = {};

export default Bluetooth;
