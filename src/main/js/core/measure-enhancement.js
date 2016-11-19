/**
 * Created by kimile on 09/10/16.
 */


function sortAsc(metric) {

    return function(a, b){
        if (a[metric] > b[metric])
            return 1;
        else if (a[metric] < b[metric])
            return -1;
        else
            return 0;
    }
}

function sortDesc(metric) {

    return function(a, b){
        if (a[metric] < b[metric])
            return 1;
        else if (a[metric] > b[metric])
            return -1;
        else
            return 0;
    }
}


function MeasureEnhancement() {}

/**
 * Check if GPS is active / tracking data by checking if there was a change in distance in last 5 measures
 * @param records
 * @param i
 * @returns {boolean}
 */
MeasureEnhancement.prototype.isGpsActive = function (records, i) {
    return this.calculateAvgInZone(records, i, 'speed', 10);
};

MeasureEnhancement.prototype.calculateAvgInZone = function (records, i, metric, offset) {
    offset = offset === undefined || offset === null ? 5 : offset;

    var start = (i - offset) < 0 ? 0 : i - offset;
    var stop = i + offset >= records.length ? records.length - 1 : i + offset;

    var total = 0;
    for (var j = start; j <= stop; j++) {
        if (j === i) continue;
        total += records[j][metric];
    }
    return total / (stop - start);
};


/**
 * Filter high SPM's values that are most likely invalid
 *
 * @param records
 * @returns {*}
 */
MeasureEnhancement.prototype.getMaxSPM = function (records) {

    if (records.length === 0) {
        return 0;
    }

    var top = records.concat().sort(sortDesc('spm'));
    top = top.slice(0, 21);
    top = top.sort(sortAsc('timestamp'));

    var avg, test = top.shift(), kept = [];
    for (var i = 0; i < records.length; i++) {

        // ignore matches at the beginning
        if (i < 5) {
            if (records[i].getTimestamp() === test.getTimestamp()) {
                test = top.shift();
            }
            continue;
        }

        if (records[i].getTimestamp() === test.getTimestamp()) {

            avg = this.calculateAvgInZone(records, i, 'spm');

            if (test.getSpm() < 1.36 * avg && (test.getSpeed() > 0 || !this.isGpsActive(records, i))) {
                kept.push(test);
            }

            if (top.length === 0)
                break;

            test = top.shift();
        }
    }

    if (kept.length === 0) {
        return records.sort(sortDesc('spm'))[0].getSpm();
    }


    kept = kept.sort(sortDesc('spm'));
    return kept[0].getSpm();
};

exports.MeasureEnhancement = MeasureEnhancement;