'use strict';

var MeasureFactory = require('./measure.js').Measure;

var Field = function(element, type, size) {
    var self = this;
    size = size || 'small';
    self.$element = $(element);
    self.createDomStructure(size);
    self.speed = size === 'small' ? 300 : 200;


    self.$measures = self.$element.find('.measures');
    self.length = self.$measures.find('div').length;
    self.width = self.$element.width();

    self.positions = [];
    self.measures = {};
    self.current = {};

    self.init(type || 0, size);
};

Field.prototype.createDomStructure = function (size) {
    this.$element.empty();

    if (size === 'small') {
        $([
            '<div class="measures">',
            '    <div class="measure" data-type="timer"></div>',
            '    <div class="measure" data-type="speed"></div>',
            '    <div class="measure" data-type="distance"></div>',
            '    <div class="measure" data-type="spm"></div>',
            '    <div class="measure" data-type="efficiency"></div>',
            '</div>'
        ].join('')).appendTo(this.$element);
    } else {

        $([
            '<div class="measures">',
            '    <div class="measure" data-type="speed"></div>',
            '    <div class="measure" data-type="distance"></div>',
            '    <div class="measure" data-type="spm"></div>',
            '    <div class="measure" data-type="efficiency"></div>',
            '</div>'
        ].join('')).appendTo(this.$element);
    }
};

Field.DEFAULTS = {
    speed: 500
};


var MeasureSpecifics = {
    timer: {
        label: "Duration",
        init: '00:00:00'
    },
    speed: {
        label: "Speed",
        units: 'Km/h'
    },
    distance: {
        label: "Distance",
        units: 'Km'
    },
    spm: {
        label: "Stroke Rate",
        units: "Per Min."
    },
    efficiency: {
        label: "Stroke Efficiency",
        units: "Meter"
    }
};

var MeasureDefaults = {
    units: "",
    // default value
    init: 0
};

Field.prototype.init = function (initialType, size) {
    var self = this, position = 0;

    // index positions
    var $dom, type, instance, options;
    self.$measures.find('.measure').each(function (i, dom) {
        $dom = $(dom);
        type = $dom.data('type');

        if (type === initialType) position = i;

        options = $.extend({}, MeasureDefaults, MeasureSpecifics[type]);

        instance = MeasureFactory.get(size, $dom, options.label, options.units, options.init);
        instance.render();
        self.positions[i] = {position: i, type: type, $dom: $dom, instance: instance};
    });


    // -- init slick and handle slick events
    setTimeout(function (position, initialType) {
        return function () {
            self.$measures.slick({
                infinite: true,
                arrows: false,
                initialSlide: position,
                speed: self.speed
            });
        }
    }(position, initialType), 0);


    self.$measures.on('beforeChange', function (event, instance, from, to) {
        self._set(to);
    });

    self.$measures.on('swipeStart', function () {
        self.$element.trigger('measureSwapStarted');
    });

    self.$measures.on('swipeEnd', function () {
        self.$element.trigger('measureSwapEnded');
    });

    self.$measures.on('afterChange', function () {
        self.$element.trigger('measureSwapEnded');
    });

    self._set(position);

};

/**
 * define current position
 * @param p
 */
Field.prototype._set = function (p) {
    this.current = this.positions[p];

    // to avoid seeing a sudden change in timer
    if (this.current.type === 'timer') {
        this.current.instance.setValue(this.time);
    }
};

Field.prototype.getType = function() {
    return this.current.type;
}


/**
 *
 * Set value of field. If type is not being corrently rendered, it will just ignore
 *
 * @param type
 * @param value
 */
Field.prototype.setValue = function (type, value) {
    if (type === 'timer') {
        this.time = value;
    }

    if (type !== this.current.type) return;

    this.current.instance.setValue(value);
};

Field.prototype.setValues = function (values) {
    if (this.current.type in values) {
        this.current.instance.setValue(values[this.current.type]);
    }

    if ('timer' in values) {
        this.time = values.timer;
    }
};

exports.Field = Field;


