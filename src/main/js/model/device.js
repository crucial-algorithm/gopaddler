'use strict';

const STORAGE_KEY = "devices";

class Device {

    constructor(name, address, addedAt = null, lastSeenAt = null) {
        this._name = name;
        this._address = address;
        this._addedAt = addedAt;
        this._lastSeenAt = lastSeenAt;
    }

    static count() {
        return Device.all().length;
    }

    /**
     *
     * @return {Device[]}
     */
    static all() {
        let result = [];
        let devices = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
        if (!devices) {
            return result;
        }

        for (let device of devices) {
            result.push(new Device(device.name, device.address, device.addedAt, device.lastSeenAt));
        }

        return result;
    }

    /**
     *
     * @return {Device[]}
     */
    static latest() {
        const devices = Device.all();
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

    /**
     * method for JSON.stringify
     * @return {{lastSeenAt: *, addedAt: *, address: *, name: *}}
     */
    toJSON() {
        return {
            name: this.name,
            address: this.address,
            addedAt: this.addedAt,
            lastSeenAt: this.lastSeenAt
        }
    }
}


export default Device;
