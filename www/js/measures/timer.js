function Timer($parent) {
    this.measure = Measure.get('small', $parent, 'Duration', undefined, '00:00:00');
    this.$parent = $parent;

    this.second = 0;
    this.minute = 0;
    this.hour = 0;
    this.render();
}


Timer.prototype.render = function() {
    this.measure.render();
}

Timer.prototype.start = function() {
    this.timer();
}

Timer.prototype.stop = function() {
    var self = this;
    clearTimeout(self.timeout);
}

Timer.prototype.timer = function() {
    var self = this;
    this.timeout = setTimeout(function () {
        self.add();
    }, 1000);
}

Timer.prototype.add = function () {
    this.second++;
    if (this.second >= 60) {
        this.second = 0;
        this.minute++;
        if (this.minute >= 60) {
            this.minute = 0;
            this.hour++;
        }
    }
    this.measure.setValue(this.toString());
    this.timer();
}

Timer.prototype.zeroPad = function (value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
}

Timer.prototype.toString = function () {
    return this.zeroPad(this.hour) + ':' + this.zeroPad(this.minute) + ':' + this.zeroPad(this.second);
}
