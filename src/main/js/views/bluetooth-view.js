'use strict';

var Bluetooth = require('../device/bluetooth').Bluetooth
    , ENABLE_BLUETOOTH_MODE = 'ENABLE_BLUETOOTH_MODE'
    , SCANNING_MODE = 'SCANNING_MODE'
    , NORMAL_MODE = 'NORMAL_MODE';

function BluetoothView(page, context, request) {
    this.$page = $(page);
    this.$startScanningButton = this.$page.find('[data-selector="bluetooth-scanning-button"]');
    this.$devices = this.$page.find('[data-selector="devices"]');
    this.bluetooth = new Bluetooth();

    this.restartInterface();
    this.initialize();
}

BluetoothView.prototype.initialize = function () {
    var self = this;

    this.bluetooth
        .initialize()
        .then(function () {
            self.setMode(SCANNING_MODE);
            self.startScan();
        }).catch(function () {
            self.restartInterface();
        });
};

BluetoothView.prototype.setMode = function (mode) {
    if (mode === SCANNING_MODE) {
        this.$startScanningButton.hide();
        this.$devices.show();
    } else if (mode === NORMAL_MODE) {
        this.$startScanningButton.hide();
        this.$devices.show();
    } else if (mode === ENABLE_BLUETOOTH_MODE) {
        this.$startScanningButton.show();
        this.$devices.hide();
    }
};

BluetoothView.prototype.startScan = function () {
    var self = this;

    this.bluetooth
        .retrieveConnected()
        .then(function (name, address) {
            self.addDevice(name, address);
        })
        .catch()
    ;

    setTimeout(function() {
        console.log('stopping bluetooth scanning!!');
        self.bluetooth.stopScan();
    }, 60);
};

BluetoothView.prototype.restartInterface = function () {
    this.$startScanningButton.show();
    this.$devices.html('');
};

BluetoothView.prototype.addDevice = function (name, address) {
    $('<button/>')
        .text(name + ':' + address)
        .appendTo(this.$devices)
    ;
};

exports.BluetoothView = BluetoothView;
