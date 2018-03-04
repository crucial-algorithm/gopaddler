'use strict';

var Bluetooth = require('../device/bluetooth').Bluetooth
    , template = require('./bluetooth.art.html')
    , rowTemplate = require('./bluetooth.row.art.html')
    , List = require('../utils/widgets/list').List
    , Device = require('../model/device').Device;

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

        self.$devices.on('touchstart', 'div.bluetooth-devices-device-forget', function (ev) {
            ev.stopPropagation();
            var $ev = $(ev.currentTarget);
            var address = $ev.data('address');

            Device.remove(address);
            if (Device.all().length === 0) {
                self.list.destroy();
                self.list = null;
                if (self.scanning) {
                    self.$noDevicesFound.hide();
                    self.$searching.show();
                } else {
                    self.$noDevicesFound.show();
                    self.$searching.hide();
                }

                return;
            }

            $ev.closest('li').remove();
            self.list.refresh();
        });

        self.$tryAgain.on('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            self.initialize();
        });

        self.initialize();
    });

}

BluetoothView.prototype.initialize = function () {
    var self = this;
    if (self.list)  {
        self.devices = {};
        self.list.clear();
    }

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

    var devices = Device.all();
    for (var i = 0; i < devices.length; i++) {
        self.addDevice(devices[i]);
    }
    if (self.list) self.list.refresh();

    self.scanning = true;
    this.bluetooth
        .startScan(function found(device) {
            if (devices[device.address]) return;

            var t = new Date().getTime();
            var d = new Device(device.name, device.address);
            d.setLastSeenAt(t);
            d.setAddedAt(t);
            Device.add(d);

            self.addDevice(d);

            self.list.refresh();
        }, function failed(err) {
            console.log(err);
        });

    setTimeout(function() {
        self.stopScan();
    }, 60000);

    self.$scan.text('searching...');
    self.$scan.addClass('bluetooth-scan-active');
    self.$progress.addClass('bluetooth-scan-active')
};

BluetoothView.prototype.stopScan = function () {
    var self = this;
    self.bluetooth.stopScan();

    self.$scan.text('scan');
    self.$progress.removeClass('bluetooth-scan-active');
    self.$progress.removeClass('bluetooth-scan-active');

    if (Device.all().length === 0) {
        self.$noDevicesFound.show();
        self.$searching.hide();
    }
    self.scanning = false;
};


/**
 * Initializes if not initialized; Ignores if initialized
 *
 */
BluetoothView.prototype.prepareDeviceList = function () {
    var self = this;
    if (self.list) return;

    self.$devices.show();
    self.$searching.hide();

    self.list = new List(self.page, {
        $elem: self.$devices,
        swipe: true,
        swipeSelector: '.bluetooth-devices-device-actions',
        ptr: {
            disabled: false,
            onRefresh: function () {
                if (self.scanning) return;

                self.initialize();
            }
        }
    });
    self.list.clear();
};

BluetoothView.prototype.addDevice = function (device) {
    var self = this;

    if (self.devices[device.getAddress()]) return;

    self.devices[device.getAddress()] = device.getName();

    self.prepareDeviceList();

    var $row = $(rowTemplate({
        device: device.getName(),
        address: device.getAddress(),
        addedAt: moment(device.getAddedAt()).format('YYYY-MM-DD')
    }));

    self.list.appendRow($row, false);
    self.list.appendRow($('<li style="display: none;"><div class="progress-line bluetooth-scan-active" style="width:100%;"></div></li>'), true);
    self.list.appendRow($('<li style="width:1%;height:0;"></li>'), true);
};

exports.BluetoothView = BluetoothView;
