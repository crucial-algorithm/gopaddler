'use strict';

var MeasureFactory = require('./measure.js').Measure;
var utils = require('../utils/utils');

var Field = function(element, type, size, context) {
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
    self.context = context;
    self.convertToImperial = context.preferences().isImperial();

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


var FIELD_SETTINGS = {
    timer: {
        label: "Duration",
        init: '00:00:00',
    },
    speed: {
        label: "Speed",
        init: 0
    },
    distance: {
        label: "Distance",
        init: 0
    },
    spm: {
        label: "Stroke Rate",
        init: 0
    },
    efficiency: {
        label: "Distance per Stroke",
        init: 0
    }
};

Field.prototype.init = function (initialType, size) {
    var self = this, position = 0;

    // index positions
    var $dom, type, instance, options;
    self.$measures.find('.measure').each(function (i, dom) {
        $dom = $(dom);
        type = $dom.data('type');

        if (type === initialType) position = i;

        options = FIELD_SETTINGS[type];

        instance = MeasureFactory.get(size, $dom, options.label, self.context.getUnit(type, size === 'large'), options.init);
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

    if (self.convertToImperial) {
        if (type === 'speed')
            value = utils.kmToMiles(value);
        if (type === 'distance')
            value = utils.kmToMiles(value);
        if (type === 'efficiency')
            value = utils.meterToFeet(value);
    }

    value = utils.round(value, self.context.getUnitDecimalPlaces(type));

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