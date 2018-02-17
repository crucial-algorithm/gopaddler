'use strict';

var Bluetooth = require('../device/bluetooth').Bluetooth
    , template = require('./bluetooth.art.html')
    , ENABLE_BLUETOOTH_MODE = 'ENABLE_BLUETOOTH_MODE'
    , SCANNING_MODE = 'SCANNING_MODE'
    , NORMAL_MODE = 'NORMAL_MODE';

function BluetoothView(page, context, request) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var self = this;

    var $page = $(page);
    this.$devices = $page.find('.bluetooth-devices');
    this.bluetooth = new Bluetooth();

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


    $page.on('appBeforeBack', function () {
        self.bluetooth.disconnect();
    })

}

BluetoothView.prototype.initialize = function () {
    var self = this;

    this.bluetooth
        .initialize()
        .then(function () {
            self.startScan();
        }).catch(function (err) {
            console.log('error initializing bluetooth', err)
        });
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

BluetoothView.prototype.addDevice = function (name, address) {
    $('<li/>')
        .text(name)
        .attr('data-mac', address)
        .appendTo(this.$devices)
    ;
};

exports.BluetoothView = BluetoothView;
