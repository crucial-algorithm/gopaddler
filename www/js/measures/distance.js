function Distance($parent, gps) {
    this.defaultValue = "0";
    this.measure = Measure.get('small', $parent, "Distance", "Km", this.defaultValue);
    this.$parent = $parent;
    this.gps = gps;
    this.render();
    this.value = undefined;
}

Distance.prototype.render = function() {
    this.measure.render();
};

Distance.prototype.start = function () {
    var self = this, previous = undefined, distance = 0, d ;

    this.gps.listen(function (position) {
        if (previous !== undefined) {
            distance += GPS.calcDistance(previous, position);

            self.value = Math.round2(distance);
            self.measure.setValue(self.value);
        }

        previous = position;
    });
};

Distance.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

Distance.prototype.getValue = function () {
    return this.value;
}