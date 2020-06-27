'use strict';

import Context from '../context';
import Device from '../model/device';
import Bluetooth from '../device/bluetooth';
import List from '../utils/widgets/list';
import template from './bluetooth.art.html';
import rowTemplate from './bluetooth.row.art.html';

class BluetoothView {
    constructor(page, context, request) {
        const self = this;

        self.devices = {};

        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        let $page = $(page);
        this.bluetooth = new Bluetooth();
        this.scanning = false;
        self.context = context;
        self.page = page;

        $page.on('appBeforeBack', function () {
            self.stopScan();
            if (self.list) self.list.destroy();
        });

        page.onReady.then(function () {

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
                if (Device.count() === 0) {
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

    initialize() {
        const self = this;
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
    }

    startScan() {
        const self = this;

        let devices = Device.all();
        for (let device of devices) {
            self.addDevice(device);
        }
        if (self.list) self.list.refresh();

        self.scanning = true;
        this.bluetooth
            .startScan(/**@param {Device} device*/ function found(device) {
                if (devices[device.address]) return;

                Device.add(device);
                self.addDevice(device);

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
    }

    stopScan() {
        const self = this;
        self.bluetooth.stopScan();

        self.$scan.text('scan');
        self.$progress.removeClass('bluetooth-scan-active');
        self.$progress.removeClass('bluetooth-scan-active');

        if (Device.count() === 0) {
            self.$noDevicesFound.show();
            self.$searching.hide();
        }
        self.scanning = false;
    }

    /**
     * Initializes if not initialized; Ignores if initialized
     */
    prepareDeviceList() {
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
    }

    /**
     *
     * @param {Device} device
     */
    addDevice(device) {
        const self = this;

        if (self.devices[device.address]) return;

        self.devices[device.address] = device.name;

        self.prepareDeviceList();

        let $row = $(rowTemplate({
            device: device.name,
            address: device.address,
            addedAt: moment(device.addedAt).format('YYYY-MM-DD')
        }));

        self.list.appendRow($row, false);
        self.list.appendRow($('<li style="display: none;"><div class="progress-line bluetooth-scan-active" style="width:100%;"></div></li>'), true);
        self.list.appendRow($('<li style="width:1%;height:0;"></li>'), true);
    }
}

export default BluetoothView;
