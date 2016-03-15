'use strict';

var MeasureFactory = require('./measure.js').Measure;
var utils = require('../utils/utils');

var Field = function(element, type, size, settings) {
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
    self.displayImperial = settings.isImperial();

    self.options = {};

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
        units: { metric: 'Km/h', imperial: 'Mi/h'},
        decimalPlaces: 1
    },
    distance: {
        label: "Distance",
        units: { metric: 'Km', imperial: 'Mi'},
        decimalPlaces: 1
    },
    spm: {
        label: "Stroke Rate",
        units: { metric: "SR/Min", imperial: "SR/Min"},
        decimalPlaces: 1
    },
    efficiency: {
        label: "Stroke Efficiency",
        units: { metric: "Meter", imperial: "Foot"},
        decimalPlaces: 1
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

        options = $.extend(true, {}, MeasureDefaults, MeasureSpecifics[type]);
        var units = options.units.metric;
        if (self.displayImperial) {
            units = options.units.imperial;
        }

        instance = MeasureFactory.get(size, $dom, options.label, units, options.init);
        instance.render();
        self.positions[i] = {position: i, type: type, $dom: $dom, instance: instance};
        self.options[type] = options;
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
};


Field.prototype.convertInValueToDisplay = function (type, value) {
    var self = this;

    if (self.displayImperial) {
        if (type === 'speed')
            value = utils.kmToMiles(value);
        if (type === 'distance')
            value = utils.kmToMiles(value);
        if (type === 'efficiency')
            value = utils.meterToFeet(value);
    }

    if (self.options[type].decimalPlaces >= 0) {
        value = utils.round(value, self.options[type].decimalPlaces);
    }

    return value;
};


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

    this.current.instance.setValue(this.convertInValueToDisplay(type, value));
};

Field.prototype.setValues = function (values) {
    if (this.current.type in values) {
        this.setValue(this.current.type, values[this.current.type]);
    }

    if ('timer' in values) {
        this.time = values.timer;
    }
};

exports.Field = Field;


