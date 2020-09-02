'use strict';

const STORAGE_KEY = "devices";

class Device {

    constructor(name, address, type, serviceUuid, characteristicUuid, addedAt = null, lastSeenAt = null) {
        this._name = name;
        this._address = address;
        this._addedAt = addedAt;
        this._lastSeenAt = lastSeenAt;
        this._type = type;
        this._serviceUuid = serviceUuid;
        this._characteristicUuid = characteristicUuid;
    }

    static count() {
        return Device.all().length;
    }

    /**
     *
     * @return {Device[]}
     */
    static all(type = null) {
        let result = [];
        let devices = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
        if (!devices) {
            return result;
        }

        for (/**@type {Device} */ let device of devices) {
            if (type === null || device.type === type)
                result.push(new Device(device.name, device.address, device.type, device.serviceUuid
                    , device.characteristicUuid, device.addedAt, device.lastSeenAt));
        }

        return result;
    }

    /**
     *
     * @return {Device[]}
     */
    static latest(type = "HR") {
        const devices = Device.all(type);
        return devices.sort(function (a, b) {
            if (a.lastSeenAt > b.lastSeenAt) {
                return 1;
            } else if (a.lastSeenAt < b.lastSeenAt) {
                return -1;
            }

            return 0;
        });
    }

    /**
     *
     * @param {Device} device
     */
    static add(device) {
        Device.remove(device.address);
        const devices = Device.all();
        devices.push(device);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    }

    static remove(address) {
        let devices = Device.all();
        for (let i = 0; i < devices.length; i++) {
            if (devices[i].address === address) {
                devices.splice(i, 1);
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
                return 1;
            }
        }
        return 0;
    }

    static updateLastSeen(address) {
        console.log('updating last seen at for ', address);
        const devices = Device.all();
        for (let device of devices) {
            if (device.address === address) {
                device.lastSeenAt = Date.now();
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
                return 1;
            }
        }
        return 0;
    }


    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get address() {
        return this._address;
    }

    set address(value) {
        this._address = value;
    }

    get addedAt() {
        return this._addedAt;
    }

    set addedAt(value) {
        this._addedAt = value;
    }

    get lastSeenAt() {
        return this._lastSeenAt;
    }

    set lastSeenAt(value) {
        this._lastSeenAt = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }


    get serviceUuid() {
        return this._serviceUuid;
    }

    set serviceUuid(value) {
        this._serviceUuid = value;
    }

    get characteristicUuid() {
        return this._characteristicUuid;
    }

    set characteristicUuid(value) {
        this._characteristicUuid = value;
    }

    /**
     * method for JSON.stringify
     * @return {{lastSeenAt: *, addedAt: *, address: *, name: *}}
     */
    toJSON() {
        return {
            name: this.name,
            address: this.address,
            type: this.type,
            serviceUuid: this.serviceUuid,
            characteristicUuid: this.characteristicUuid,
            addedAt: this.addedAt,
            lastSeenAt: this.lastSeenAt
        }
    }
}


export default Device;
