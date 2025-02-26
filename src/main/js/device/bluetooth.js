'use strict';

import Device from '../model/device';
import AppSettings from "../utils/app-settings";


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
    SUBSCRIBE_ERROR: 'SUBSCRIBE_ERROR',
    PAIRING_ERROR: 'PAIRING/BOND ERROR',
    DISCONNECT_ERROR: 'DISCONNECT ERROR',
    CLOSE_ERROR: 'CLOSE ERROR'
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
        this.successfulConnections = 0;
        this._disconnecting = false;
    }

    /**
     * @return {Promise} Resolve if the bluetooth successfully enabled, reject otherwise
     */
    initialize() {
        let params = {
            "request": true,
            "statusReceiver": true,
            "restoreKey": `${AppSettings.app()}-app`
        };

        return new Promise(function (resolve, reject) {
            if (isBluetoothInitialized) {
                console.log('ble initialized... resolve');
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
        let scannedDevicesAddress = {};
        bluetoothle.startScan(async function (device) {

            if (device.status === 'scanStarted') {
                console.log('scanStarted');
                return
            }

            if (!device.name) {
                return;
            }

            if (scannedDevicesAddress.hasOwnProperty(device.address)) {
                return;
            }

            scannedDevicesAddress[device.address] = true;

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

    stopScan(callback) {
        bluetoothle.stopScan(function stopScanSuccess(result) {
            console.log('stop scan succeeded', result)
            if (callback) callback()
        }, function stopScanError(error) {
            console.error('stop scan failed', error)
        });
    }

    /**
     * @private
     * @param types
     */
    getServiceUUIDsForTypes(types) {
       const uuids = [];
       Object.keys(BLE_PROFILES).map((type) => {
           types.includes(type) && uuids.push(BLE_PROFILES[type].SERVICE_UUID)
       })
        return uuids
    }

    async availableDevices(devices, fromTypes) {
        console.log(`scanning for devices nearby from ${fromTypes.join()} - ${this.getServiceUUIDsForTypes(fromTypes)}`)
        return new Promise((resolve, reject) => {
            const devicesFound = [];
            const types = {};
            let scanStopped = false;
            setTimeout(async () => {
                if (!scanStopped) await this.stopScan();
                resolve(devicesFound)
            }, 7000)
            bluetoothle.startScan((scanResult) => {
                if (scanResult.status === 'scanStarted') {
                    console.log('looking for available devices')
                    return
                }

                /**@type Device */
                const knownDevice = devices.find((d) => d.address === scanResult.address);
                if (knownDevice === undefined) {
                    console.log('found an unknown device... ignore', scanResult.address, scanResult)
                    return
                }

                if (types[knownDevice.type] === true) {
                    console.log('found a device for which we have a previous known device', scanResult.address)
                    return;
                }

                if (!devicesFound.find((d) => d.address === knownDevice.address)) devicesFound.push(knownDevice);
                types[knownDevice.type] = knownDevice.type;
                console.log(`device ${scanResult.address} is nearby`);

                if (Object.keys(types).length === Object.keys(Bluetooth.TYPES()).length) {
                    console.log('found 1 device for each device type... exiting')
                    this.stopScan(() => {
                        scanStopped = true;
                        resolve(devicesFound)
                    })
                }
            }, (error) => {
                console.error('no devices found', error.message)
                resolve([])
            }, {services: this.getServiceUUIDsForTypes(fromTypes)})
        })
    }

    /**
     * Scan for devices process
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
                console.log('connecting...');
                await self.connect(address);
                console.log('connected | Discovering...');
                let info = await self.discover(address);
                console.log('Discovered | Pairing...');
                await self.pair(address);
                console.log('Paired | Subscribing...');
                await self.subscribeCharacteristic(address, info.service.uuid, info.characteristic.uuid);
                console.log('Subscribed | Disconnecting...');
                await self.disconnect(address).catch((error) => {
                    console.log('failed to disconnect', error);
                });
                resolve(info);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * @private
     * @param address
     * @param [onDeviceDisconnected]
     * @return {Promise<unknown>}
     */
    async connect(address, onDeviceDisconnected = () => {}) {
        return new Promise((resolve, reject) => {
            bluetoothle.connect(() => {
                this.successfulConnections++
                if (this.successfulConnections === 1) {
                    resolve();
                    return
                }

                // disconnected: when callback is called more than once,
                // it's because the state of the connection changed
                if (this.disconnecting) {
                    return; // disconnect was triggered by "us"
                }

                // connect callback is called 2nd time for disconnect events
                console.log('connection closed by the device... disconnect and notify sensor to start reconnect protocol')
                this.disconnect(address).finally(() => {
                    this.successfulConnections = 0;
                    onDeviceDisconnected();
                });
            }, async (err) => {
                console.log('something wrong with the connection to ', address, err);
                if (err.message === "Device previously connected, reconnect or close for new device") {
                    console.log('Device already connected, try to disconnect before next attempt');
                    try {
                        await this.disconnect(address);
                    } catch (err) {
                        // intentionally left blank
                    }
                }
                reject({type: ERROR.CONNECT_ERROR, err});
            }, {
                address: address,
                autoConnect: false
            });
        });
    }

    /**
     * @private
     * @param address
     * @return {Promise<{address: string, service: BleService, characteristic: BleCharacteristic}>}
     */
    async discover(address) {
        return new Promise((resolve, reject) => {
            bluetoothle.discover((discovered) => {

                let service = this.scanServices(discovered.services);
                // noinspection JSIncompatibleTypesComparison
                if (service === null) return reject({type: ERROR.UNKNOWN_DEVICE_TYPE});

                let characteristic = this.scanCharacteristics(service.characteristics);
                // noinspection JSIncompatibleTypesComparison
                if (characteristic === null) return reject({type: ERROR.UNKNOWN_DEVICE_TYPE});

                resolve({address, service, characteristic});

                if (navigator.userAgent !== 'gp-dev-ck')
                    console.log("discover complete", address);

            }, (err) => {
                console.log(`ble discover failed with error ${err.message}`);
                if (err.error === "neverConnected") {
                    // try to reconnect
                    this.evaluateDeviceFoundOnScan(address);
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
     * @param onDeviceDisconnected
     */
    async listen(device, callback, onError, onDeviceDisconnected = () => {}) {
        const self = this;
        const address = device.address;
        try {
            await self.connect(address, onDeviceDisconnected);
            console.log(`ble connection established ${device.name} (${device.address})`);
            await self.discover(address);
            console.log(`ble discovery finished established ${device.name} (${device.address})`);
            await self.subscribeCharacteristic(address, device.serviceUuid, device.characteristicUuid, (value) => {
                callback.apply({}, [value]);
            });
        } catch (err) {
            onError(err);
        }

        self.address = address;
    }

    async isLocationEnabled() {
        return new Promise((resolve, reject) => {
            bluetoothle.isLocationEnabled(async (status) => {
                if (status.isLocationEnabled === true) return resolve()
                await this.requestLocation();
                resolve()
            }, (err) => {
                console.log(`ble location enabled check failed ${err.message}`);
                reject(err)
            });
        })
    }

    async requestLocation() {
        return new Promise((resolve, reject) => {
            bluetoothle.requestLocation((status) => {
                if (status.requestLocation === true)
                    resolve()
                else
                    reject()
            }, (err) => {
                console.log(`ble request location failed ${err.message}`);
                reject()
            });
        })
    }

    /**
     * Subscribe to characteristic
     * @param address
     * @param serviceUUID
     * @param characteristicUUID
     * @param listener
     */
    subscribeCharacteristic(address, serviceUUID, characteristicUUID, listener = ()=>{}) {
        const self = this;
        return new Promise((resolve, reject) => {
            let first = true;
            bluetoothle.subscribe(function (result) {
                if (!result.value) return;
                let value = self.decode(serviceUUID, result.value);
                listener(value);
                if (first) {
                    resolve(value);
                    first = false;
                }
            }, (error) => {
                reject({type: ERROR.SUBSCRIBE_ERROR, error})
            }, {
                address: address,
                service: serviceUUID,
                characteristic: characteristicUUID
            });
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
     * @private
     * @param address
     * @return {Promise<unknown>}
     */
    async pair(address) {
        return new Promise(function (resolve, reject) {
            if (window.cordova.platformId === 'ios') return resolve();
            bluetoothle.bond(function success(result) {
                if (result.status === 'unbonded') return reject({type: ERROR.PAIRING_ERROR, error: 'received unbonded message'});
                if (result.status === 'bonding') return;
                resolve();
            }, function (error) {
                if (error.message === 'Device already bonded') {
                    return resolve();
                }
                reject({type: ERROR.PAIRING_ERROR, error});
            }, {address: address});
        });
    }

    unpair(address) {
        this.address = address;
        return new Promise(function (resolve, reject) {
            bluetoothle.unbond(function success(result) {
                if (result.status === 'unbonded')
                    resolve();
            }, function (error) {
                if (error.message === 'Device already unbonded') {
                    return resolve();
                }
                reject(error)
            }, {address: address});
        });
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

    async disconnect(address) {
        this.disconnecting = true;
        return new Promise(async (resolve, reject) => {
            const disconnect = (address) => new Promise((resolve, reject) => {
                bluetoothle.disconnect(function () {
                    console.log(`disconnecting from ${address} succeeded`)
                    resolve();
                }, function (error) {
                    console.log(`disconnecting from ${address} failed: ${error.message}`)
                    reject({type: ERROR.DISCONNECT_ERROR, error});
                }, {address: address});
            });

            const close = (address) => new Promise((resolve, reject) => {
                bluetoothle.close(function () {
                    console.log(`closed ${address}`)
                    resolve();
                }, function (error) {
                    console.log(`closing ${address} failed`)
                    reject({type: ERROR.CLOSE_ERROR, error});
                }, {address: address});
            });

            console.log(`disconnecting from ${address}`)
            if (!address && this.address === null) {
                console.log(`disconnecting from ${address} not going through... no known address`)
                this.disconnecting = false;
                resolve();
            }
            address = address || this.address;

            try {
                await disconnect(address);
            } catch (err) {
                // intentionally left blank
                console.log(err)
            }

            try {
                await close(address);
            } catch (err) {
                this.disconnecting = false;
                reject(err)
            }
            this.disconnecting = false;
            resolve()
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


    get disconnecting() {
        return this._disconnecting;
    }

    set disconnecting(value) {
        this._disconnecting = value;
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
        return this.cadence(previous = {
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
