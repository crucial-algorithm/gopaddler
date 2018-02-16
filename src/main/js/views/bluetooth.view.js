'use strict';

var Bluetooth = require('../device/bluetooth').Bluetooth
    , template = require('./bluetooth.art.html')
    , ENABLE_BLUETOOTH_MODE = 'ENABLE_BLUETOOTH_MODE'
    , SCANNING_MODE = 'SCANNING_MODE'
    , NORMAL_MODE = 'NORMAL_MODE';

function BluetoothView(page, context, request) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var self = this;

    this.$page = $(page);
    this.$startScanningButton = this.$page.find('[data-selector="bluetooth-scanning-button"]');
    this.$devices = this.$page.find('[data-selector="devices"]');
    this.bluetooth = new Bluetooth();

    this.restartInterface();
    this.initialize();

    this.$devices.on('click', 'li', function (ev) {
        var $ev = $(ev.target);
        var address = $ev.data('mac');

        self.bluetooth.pair(address).then(function () {
            $ev.addClass('success');
            localStorage.setItem('ble-mac-address', address);
        }).catch(function (error) {
            console.log('failed pair', error)
        });

    });
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
        .then(function (device) {
            self.addDevice(device.name, device.mac);
        })
        .catch(function(err) {
            console.log(err);
        })
    ;

    setTimeout(function() {
        self.bluetooth.stopScan();
    }, 60000);
};

BluetoothView.prototype.restartInterface = function () {
    this.$startScanningButton.show();
    this.$devices.html('');
};

BluetoothView.prototype.addDevice = function (name, address) {
    $('<li/>')
        .text(name + ':' + address)
        .attr('data-mac', address)
        .appendTo(this.$devices)
    ;
};

exports.BluetoothView = BluetoothView;
