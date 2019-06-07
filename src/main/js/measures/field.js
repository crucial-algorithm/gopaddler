'use strict';

var MeasureFactory = require('./measure.js').Measure;
var utils = require('../utils/utils');

var Field = function(element, type, size, context, enableSplits) {
    var self = this;
    size = size || 'small';
    self.$element = $(element);
    self.createDomStructure(size, (enableSplits === true));
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

Field.prototype.createDomStructure = function (size, enableSplits) {
    this.$element.empty();

    if (size === 'small') {
        var dom = [
            '<div class="measures">',
            '    <div class="measure" data-type="timer"></div>',
            '    <div class="measure" data-type="splits"></div>',
            '    <div class="measure" data-type="speed"></div>',
            '    <div class="measure" data-type="distance"></div>',
            '    <div class="measure" data-type="pace"></div>',
            '    <div class="measure" data-type="spm"></div>',
            '    <div class="measure" data-type="efficiency"></div>',
            '    <div class="measure" data-type="strokes"></div>',
            '    <div class="measure" data-type="heartRate"></div>',
            '</div>'
        ];
        if (enableSplits !== true)
            dom.splice(2, 1); // remove splits if no planned session

        $(dom.join('')).appendTo(this.$element);
    } else {

        $([
            '<div class="measures">',
            '    <div class="measure" data-type="speed"></div>',
            '    <div class="measure" data-type="distance"></div>',
            '    <div class="measure" data-type="pace"></div>',
            '    <div class="measure" data-type="spm"></div>',
            '    <div class="measure" data-type="efficiency"></div>',
            '    <div class="measure" data-type="strokes"></div>',
            '    <div class="measure" data-type="heartRate"></div>',
            '</div>'
        ].join('')).appendTo(this.$element);
    }
};

Field.DEFAULTS = {
    speed: 500
};


var FIELD_SETTINGS = {
    timer: {
        label: "session_duration",
        init: '00:00:00'
    },
    splits: {
        label: "session_splits",
        init: 'session_splits_before_start',
        hint: true,
        translate: true
    },
    speed: {
        label: "session_speed",
        init: 0
    },
    distance: {
        label: "session_distance",
        init: 0
    },
    spm: {
        label: "session_spm",
        init: 0
    },
    efficiency: {
        label: "session_efficiency",
        init: 0
    },
    strokes: {
        label: "session_strokes_hundred",
        init: 0
    },
    pace: {
        label: "session_pace",
        init: 0
    },
    heartRate: {
        label: "session_heart_rate",
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

        instance = MeasureFactory.get(size, $dom, self.context.translate(options.label)
            , self.context.getUnit(type, size === 'large')
            , options.translate === true ? self.context.translate(options.init) : options.init
            , self.context.isPortraitMode());
        instance.render(options.hint);
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

Field.prototype.animateTransition = function () {
    var self = this;
    setTimeout(function () {
        var $active = self.$element.find('.slick-active');
        $active.animate({marginLeft: $active.width() / 1.7 * -1}, 1000, undefined, function () {
            $active.animate({marginLeft: 0}, 1000);
        });
    }, 2000);

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

    if (value === undefined)
        value = 0;

    if (self.convertToImperial) {
        if (type === 'speed')
            value = utils.kmToMiles(value);
        if (type === 'distance')
            value = utils.kmToMiles(value);
        if (type === 'efficiency')
            value = utils.meterToFeet(value);
    }

    if (self.context.round(type))
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

Field.prototype.setUnit = function (type, unit) {
    if (this.current.type === type)
        this.current.instance.setUnit(unit);
};

exports.Field = Field;
