import BleSensor from "./ble-sensor";
import Device from "../model/device";
import Bluetooth from "./bluetooth";

const RETRY_TIMER_BOUNCE_BACK_SECONDS = [
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, // 00 to 5'  | every 30''
    60, 60, 60, 60, 60, 60,                 // up to 10' | every 1'
    300, 300, 300, 300, 300, 300            // up to 40' | every 5'
]

export default class BleManager {
    constructor() {
        this._sensors = []
        this._devices = Device.all();
        this._bluetooth = new Bluetooth();
        this._available = {
            HR: null,
            CYCLING_CADENCE: null
        };
        this._retryTimeOut = -1;
        this._connected = []

    }

    pendingDevices() {
        return this.devices.filter((d) => this.available[d.type] === null)
    }

    async start() {
        const retries = [...RETRY_TIMER_BOUNCE_BACK_SECONDS];
        const connectAttempt = async () => {
            console.log(`... connection attempt ${RETRY_TIMER_BOUNCE_BACK_SECONDS.length - retries.length + 1}`);
            const result = await this.connect();
            if (result === false) return;
            this._retryTimeOut = setTimeout(() => connectAttempt(), retries.shift() * 1000)
        }

        await this.bluetooth.initialize();
        await connectAttempt();
    }

    /**
     * @private
     * @returns {Promise<Array[]|boolean>}
     */
    async connect() {
        if (this.pendingDevices().length === 0) {
            console.log('All know devices connected... terminating')
            return false;
        }
        let devices = await this.bluetooth.availableDevices(
            this.devices.filter((d) => this.available[d.type] === null),
            // filter to types we are not yet connected to
            Object.keys(this.available).filter((type) => this.available[type] === null)
        );
        console.log(`... found ${devices.length} nearby`, devices);

        if (devices.length === 0) {
            return []
        }

        // make each type of device unique, picking the 1st one in the list
        devices = devices.filter((d) => this.available[d.type] === null)

        // assign the address to each type in the available address dictionary
        devices.map((d) => this.available[d.type] = d.address);

        return Promise.all(this.sensors.map((sensor) => {
            return new Promise(async (resolve, reject) => {
                const address = this.available[sensor.type];
                if (!address) return
                try {
                    const device = this.devices.find((d) => d.address === address);
                    await sensor.connectTo(device);
                    console.log(`connected to ${address} of type ${device.type}`);
                    resolve();
                } catch (err) {
                    console.log('failed subscribe to device', err)
                    this.available[sensor.type] = null
                    reject()
                }
            })
        }))

    }

    stop() {
        clearInterval(this._retryTimeOut);
        this.sensors.map((s) => s.stop());
    }

    pause() {
        this.sensors.map((s) => s.pause())
    }

    resume() {
        this.sensors.map((s) => s.resume())
    }

    getBleSensor(type) {
        const sensor = new BleSensor(type);
        this.sensors.push(sensor);
        return sensor;
    }


    get sensors() {
        return this._sensors;
    }

    set sensors(value) {
        this._sensors = value;
    }

    get devices() {
        return this._devices;
    }

    set devices(value) {
        this._devices = value;
    }

    get bluetooth() {
        return this._bluetooth;
    }

    set bluetooth(value) {
        this._bluetooth = value;
    }


    get available() {
        return this._available;
    }

    set available(value) {
        this._available = value;
    }

    get connected() {
        return this._connected;
    }

    set connected(value) {
        this._connected = value;
    }
}