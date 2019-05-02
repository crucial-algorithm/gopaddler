
function DistanceProgressBar($parent) {
    this.$dom = $('<div class="widget-distance-progress-bar"></div>');
    this.$label = $('<span class="label">&nbsp;</span>').appendTo(this.$dom);
    this.$level = $('<div class="level">&nbsp;</div>').appendTo(this.$dom);
    this.$container = $parent;
    this.duration = 0;
}

DistanceProgressBar.prototype.start = function(distance) {
    this.$dom.appendTo(this.$container);
    this.$level.css("height", "100%");
    this.duration = distance;
    this.$label.html(distance);
};

DistanceProgressBar.prototype.update = function(distance) {
    var percentage = Math.floor(distance / this.duration * 100);
    this.$level.css("height", percentage + "%");
    this.$label.html(distance);
};

DistanceProgressBar.prototype.finish = function() {
    this.$dom.detach();
};


exports.DistanceProgressBar = DistanceProgressBar;