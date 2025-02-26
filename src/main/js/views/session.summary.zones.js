import Api from "../server/api";
import Utils from "../utils/utils";
import Context from "../context";
import GpChart from "../utils/widgets/chart";

export default class SessionSummaryZones {
    /**
     *
     * @return {number}
     */
    static hidePercentageThreshold() {
        return 5;
    }

    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} records
     * @param {Context} context
     */
    constructor(session, records, context) {
        const athlete = Api.User.get();
        let spmZones = new Array(athlete.strokeRateZones.length).fill(0)
            , speedZones = new Array(athlete.speedZones.length).fill(0)
            , heartRateZones = new Array(athlete.heartRateZones.length).fill(0)
            , spmToSpeedZones
        ;


        this.speedZones = this.prepareZoneChartsData(records, "speed", session.avgSpeed, speedZones, this.convertZoneEndToInfinity(athlete.speedZones));
        this.spmZones = this.prepareZoneChartsData(records, "spm", session.avgSpm, spmZones, this.convertZoneEndToInfinity(athlete.strokeRateZones));
        this.heartRateZones = this.prepareZoneChartsData(records, "heartRate", session.avgHeartRate
            , heartRateZones, this.convertZoneEndToInfinity(athlete.heartRateZones), (hr) => {
                return Utils.heartRateReserveCalculation(context.getRestingHeartRate(), context.getMaxHeartRate(), hr);
            }, (() => {
                let matrix = [];
                for (let i = 0; i <= 300; i++) {
                    matrix.push(Utils.heartRateReserveCalculation(context.getRestingHeartRate(), context.getMaxHeartRate(), i));
                }
                return (zone)=> {
                    return matrix.indexOf(zone);
                }
            })());

        spmToSpeedZones = spmZones.slice();
        for (let i = 0, l = athlete.strokeRateZones.length; i < l; i++) {
            if (spmToSpeedZones[i] === 0) {
                spmToSpeedZones[i] = [];
                continue;
            }
            let zone = athlete.strokeRateZones[i];
            spmToSpeedZones[i] = [];
            for (let record of records) {
                if (record.getSpm() >= zone.start && record.getSpm() <= zone.end && record.recovery === false) {
                    spmToSpeedZones[i].push(record.getSpeed());
                }
            }
        }

        let discarding = false, percentage;
        this.spmToSpeedZones = [];
        for (let ss = 0; ss < spmToSpeedZones.length; ss++) {
            if (spmToSpeedZones[ss] === undefined || spmToSpeedZones[ss].length === 0) continue;
            percentage = Math.round(spmToSpeedZones[ss].length / records.length * 100);
            if (percentage === 0) continue;
            let stats = Utils.minMaxAvgStddev(spmToSpeedZones[ss]);
            this.spmToSpeedZones.push({
                zone: `${athlete.strokeRateZones[ss].start}-${athlete.strokeRateZones[ss].end}`,
                avg: Utils.round2(stats.avg),
                min: Utils.round2(Math.max(0, stats.avg - stats.stddev)),
                max: Utils.round2(stats.avg + stats.stddev)
            });
            discarding = false;
        }

        this.duration = session.sessionEnd - session.sessionStart - session.pausedDuration;
    }

    /**
     * @param {Array<SessionDetail>}                                                    records
     * @param {string}                                                                  property
     * @param {number}                                                                  avg
     * @param {Array<number>}                                                           zones
     * @param {Array<AthleteTrainingZone>}                                              definition  zones definition
     * @param {function}                                                                process     function to process value
     * @param {function}                                                                reverse     Reverts process function (previous param)
     * @return {{labels: Array<string>, data: Array<number>}}
     */
    prepareZoneChartsData(records, property, avg, zones, definition, process = (value) => {
        return Math.floor(value)
    }, reverse = (zone) => { return zone}) {
        let labels = [], data = [];
        let stats = this.calculateZones(records, definition.slice(0), property, zones, [], process);
        let lower = avg - Utils.minMaxAvgStddev(records.map(function (rec) {
            return rec[property]
        })).stddev;
        let percentage;
        for (let i = 0; i < zones.length; i++) {
            if (zones[i] === undefined) continue;
            percentage = Math.round(zones[i] / stats.workingCount * 100);

            let zone = definition[i];
            if (zone.start === zone.end) {
                labels.push(reverse(zone.start));
            } else {
                labels.push(`${reverse(zone.start)}${zone.end === Infinity ? '+' : '-' + reverse(zone.end)}`);
            }
            data.push(percentage);
        }
        return {labels: labels, data: data};
    }

    render(context, template, $container) {
        const self = this;

        Context.render($container, template({
            isPortraitMode: context.isPortraitMode()
            , speedZones: self.speedZones
            , spmZones: self.spmZones
            , heartRateZones: self.heartRateZones
            , spmToSpeedZones: self.spmToSpeedZones
        }));

        setTimeout(() => {
            this.loadCharts()
        }, 0);
    }

    loadCharts() {

        /**@type ChartOptions */
        let options = {
            /**@type ChartLabelOptions*/
            labels: {
                display: true,
                size: 12,
                rotation: 0,
                formatter: (value)=> { return Utils.displayDurationHasTime(value/100 * this.duration) }
            },
            displayYAxisGridLines: false,
            displayXAxisGridLines: true,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 20
        };

        new GpChart(document.getElementById('zones-speed'), GpChart.TYPES().BAR, this.speedZones.labels
            , GpChart.dataset(this.speedZones.data)
            , options, false);

        new GpChart(document.getElementById('zones-spm'), GpChart.TYPES().BAR, this.spmZones.labels
            , GpChart.dataset(this.spmZones.data)
            , options, false);

        new GpChart(document.getElementById('zones-heart-rate'), GpChart.TYPES().BAR, this.heartRateZones.labels
            , GpChart.dataset(this.heartRateZones.data)
            , options, false);
    }

    /**
     *
     * @param {Array<SessionDetail>}        data
     * @param {Array<AthleteTrainingZone>}  zones
     * @param {string}                      property        Property from data that should be read
     * @param {Array}                       aggregator      Write working output
     * @param {Array}                       aggregatorFull  Write full output
     * @param {function}                    process         function to process value
     * @return {{count: number, workingCount: number, total: number, working: number}}
     */
    calculateZones(data, zones, property, aggregator, aggregatorFull, process = function (value) {
        return Math.floor(value)
    }) {
        let total = 0, working = 0, workingCount = 0, count = 0;

        this.loopZones(data, zones, property, function (value, position) {
            workingCount++;
            aggregator[position] = aggregator[position] === undefined ? 1 : aggregator[position] + 1;
            working += value;
        }, function all(value, position) {
            count++
            aggregatorFull[position] = aggregatorFull[position] === undefined ? 1 : aggregatorFull[position] + 1;
            total += value;
        }, process);


        return {
            working: working,
            workingCount: workingCount,
            count: count,
            total: total
        }
    }

    /**
     *
     * @param {Array<SessionDetail>}        data
     * @param {Array<AthleteTrainingZone>}  zones
     * @param {string}                      property        Property from data that should be read
     * @param {function}                    working         Write working output
     * @param {function}                    all             Write full output
     * @param {function}                    process         function to process value

     */
    loopZones(data, zones, property, working, all, process = function (value) {
        return Math.floor(value)
    }) {
        let index = -1;

        while (zones.length > 0) {
            let zone = zones.shift();
            index++;

            for (let record of data) {
                let value = process(record[property]);

                if (value >= zone.start && value <= zone.end) {
                    all.apply({}, [record[property], index, record]);

                    if (record.recovery) continue;
                    working.apply({}, [record[property], index, record]);
                }
            }
        }
    }

    /**
     *
     * @param {Array<AthleteTrainingZone>} zones
     * @return {Array<AthleteTrainingZone>}
     */
    convertZoneEndToInfinity(zones) {
        if (zones.length === 0) return zones;
        let last = zones[zones.length - 1];
        if (typeof last.end !== 'object') return zones;
        if (last.end.$InfNaN === 1) {
            last.end = Infinity;
        }
        return zones;
    }
}