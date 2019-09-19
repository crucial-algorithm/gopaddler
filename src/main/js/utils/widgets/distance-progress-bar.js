'use strict';

class DistanceProgressBar {

    constructor($parent) {
        this.$dom = $('<div class="widget-distance-progress-bar"></div>');
        this.$label = $('<span class="label">&nbsp;</span>').appendTo(this.$dom);
        this.$level = $('<div class="level">&nbsp;</div>').appendTo(this.$dom);
        this.$container = $parent;
        this.duration = 0;
    }

    start(distance) {
        this.$dom.appendTo(this.$container);
        this.$level.css("height", "100%");
        this.duration = distance;
        this.$label.html(distance);
    }

    update(distance) {
        var percentage = Math.floor(distance / this.duration * 100);
        this.$level.css("height", percentage + "%");
        this.$label.html(distance);
    }

    finish() {
        this.$dom.detach();
    }
}

export default DistanceProgressBar;