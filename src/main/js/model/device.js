'use strict';

var STORAGE_KEY = "devices";

function Device(name, address) {
    var self = this;
    self.name = name;
    self.address = address;
    self.addedAt = null;
    self.lastSeenAt = null;
}

Device.prototype.getName = function () {
    return this.name;
};

Device.prototype.setName = function (name) {
    this.name = name;
};

Device.prototype.getAddress = function () {
    return this.address;
};

Device.prototype.setAddress = function (address) {
    this.address = address;
};

Device.prototype.getAddedAt = function() {
    return this.addedAt;
};

Device.prototype.setAddedAt = function(when) {
    this.addedAt = when;
};

Device.prototype.getLastSeenAt = function() {
    return this.lastSeenAt;
};

Device.prototype.setLastSeenAt = function(when) {
    this.lastSeenAt = when;
};

function all() {
    var result = [];
    var devices = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!devices) {
        return result;
    }

    var device;
    for (var i = 0; i < devices.length; i++) {
        device = new Device(devices[i].name, devices[i].address);
        device.setAddedAt(devices[i].addedAt);
        device.setLastSeenAt(devices[i].lastSeenAt);
        result.push(device);
    }

    return result;
}

function latest() {
    var devices = all();
    return devices.sort(function (a, b) {
        if (a.getLastSeenAt() > b.getLastSeenAt()) {
            return 1;
        } else if (a.getLastSeenAt() < b.getLastSeenAt()) {
            return -1;
        }

        return 0;
    });
}

Device.all = all;
Device.latest = latest;

Device.add = function (device) {
    Device.remove(device.getAddress());
    var devices = all();
    devices.push(device);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
};

Device.remove = function(address) {
    var devices = all();
    for (var i = 0; i < devices.length; i++) {
        if (devices[i].address === address) {
            devices.splice(i, 1);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
            return 1;
        }
    }
    return 0;
};

Device.updateLastSeen = function (address) {
    var devices = all();
    for (var i = 0; i < devices.length; i++) {
        if (devices[i].address === address) {
            devices[i].setLastSeenAt(new Date().getTime());
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
            return 1;
        }
    }
    return 0;
};


exports.Device = Device;
