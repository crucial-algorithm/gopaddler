'use strict';

var Bluetooth = require('../device/bluetooth').Bluetooth
    , template = require('./bluetooth.art.html')
    , List = require('../utils/widgets/list').List
    , noDevicesFound = true;

function BluetoothView(page, context, request) {
    var self = this;

    self.devices = {};

    context.render(page, template({isPortraitMode: context.isPortraitMode()}));

    var $page = $(page);
    this.bluetooth = new Bluetooth();
    this.scanning = false;
    self.context = context;
    self.page = page;

    $page.on('appBeforeBack', function () {
        self.stopScan();
    });

    page.onShown.then(function () {

        self.$scan = $page.find('.bluetooth-scan-button');
        self.$devices = $page.find('.bluetooth-devices');
        self.$progress = $page.find('.progress-line');
        self.$noDevicesFound = $page.find('[data-selector="no-devices-found"]');
        self.$searching = $page.find('[data-selector="searching-devices"]');
        self.$tryAgain = $page.find('p[data-selector="no-devices-found"]');

        self.$devices.on('click', 'li', function (ev) {
            var $ev = $(ev.currentTarget);
            var paired = $ev.data('paired');

            var address = $ev.data('address');
            var $name = $ev.find('.bluetooth-devices-device-name');

            if (paired === "true") {
                localStorage.setItem('ble-mac-address', address);
                return;
            }

            self.bluetooth.pair(address).then(function () {
                $ev.addClass('success');
                $name.text(self.devices[address]);
                localStorage.setItem('ble-mac-address', address);
            }).catch(function (error) {
                if (error.message === 'Device previously connected, reconnect or close for new device') {
                    self.bluetooth.close({
                        address: address
                    })
                }
                console.log('failed pair', error)
            });
        });

        self.$tryAgain.on('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (self.list) self.list.clear();
            self.initialize();
        });

        self.initialize();
    });

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
        .then(function (devices) {

            noDevicesFound = devices.length === 0;
            for (var i = 0; i < devices.length; i++) {
                self.addDevice(devices[i].name, devices[i].mac, true);
            }

            self.bluetooth.startScan().then(function (device) {
                noDevicesFound = false;
                self.addDevice(device.name, device.mac, false);
            }).catch(function (err) {
                console.log(err);
            });
        })
        .catch(function(err) {
            console.log(err);
        })
    ;

    setTimeout(function() {
        self.stopScan();
    }, 60000);

    self.$scan.text('searching...');
    self.$scan.addClass('bluetooth-scan-active');
    self.$progress.addClass('bluetooth-scan-active')
};

BluetoothView.prototype.initList = function () {
    var self = this;

    self.$devices.show();
    self.$searching.hide();

    setTimeout(function () {

        self.list = new List(self.page, {
            $elem: self.$devices,
            swipe: true,
            swipeSelector: '.bluetooth-devices-device-actions',
            ptr: {
                disabled: true
            }
        });

    }, 0);

    self.list.clear();
};

BluetoothView.prototype.stopScan = function () {
    var self = this;
    self.bluetooth.stopScan();

    self.$scan.text('scan');
    self.$progress.removeClass('bluetooth-scan-active');
    self.$progress.removeClass('bluetooth-scan-active');

    if (noDevicesFound) {
        self.$noDevicesFound.show();
        self.$searching.hide();
    }
};

BluetoothView.prototype.addDevice = function (name, address, paired) {
    var self = this;

    if (self.devices[address]) return;

    self.devices[address] = name;

    if (!self.list) {
        self.$devices.show();
        self.$searching.hide();


        self.list = new List(self.page, {
            $elem: self.$devices,
            swipe: true,
            swipeSelector: '.bluetooth-devices-device-actions',
            ptr: {
                disabled: true
            }
        });


        self.list.clear();
    }

    var row = [ ''
        , '<li data-paired="' + (paired === true) + '" class="bluetooth-devices-device" data-address="' + address + '">'
        , '    <div class="bluetooth-devices-device-name">'
        , '        ' + name + (paired ? "" : " (Click to Pair)")
        , '    </div>'
        , '    <div class="bluetooth-devices-device-actions">'
        , '        <div class="bluetooth-devices-device-forget-action">Forget</div>'
        , '    </div>'
        , '</li>'
    ].join('');

    this.list.appendRow($(row), false);
};

exports.BluetoothView = BluetoothView;
