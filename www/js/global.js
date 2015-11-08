// Converts from degrees to radians.
Math.toRadians = function(degrees) {
    return degrees * Math.PI / 180;
};

Math.round2 = function(value) {
    return Math.round(value * 100) / 100;
};


Array.prototype.avg = function () {
    if (this.length ===0) return 0;
    var value = 0;
    for (var i = 0; i < this.length; i++) {
        value += this[i];
    }
    return value / this.length;
};


// calculates cadence based on 5 strokes
Array.prototype.cadence = function() {
    if (this.length < 5) return undefined;
    var data = this.slice(0), i = 0, total = 0, current, previous;
    for (var j = data.length; i <= 5; j--) {
        current = data[j];
        if (!previous) {
            previous = current;
            i++;
            continue;
        }

        total += previous.getSampleAt() - current.getSampleAt();

        previous = current;
        i++;
    }

    return total / (i - 1);
}


Array.prototype.indexOf = function (value) {
    if (this.length === 0) return -1;

    for (var i = 0; i < this.length; i++) {
        if (this[i] === value) {
            return i;
        }
    }
    return -1;
}

/**
 * remove from beginning
 * @param milis
 */
Array.prototype.after = function (milis) {
    if (this.length == 0)
        return [];

    var first = this[0].getSampleAt();
    for (var i = 0; i < this.length; i++) {

        if (this[i].getSampleAt() > first + milis)
            break;
    }
    return this.slice(i, this.length);
}

/**
 * Remove from end
 *
 * @param milis
 * @returns {Array}
 */
Array.prototype.before = function(milis) {
    if (this.length == 0)
        return [];
    var last = this[this.length - 1].getSampleAt();
    for (var i = (this.length - 1); i >= 0; i--) {

        if (this[i].getSampleAt() < last - milis)
            break;
    }
    return this.slice(0, i);
};