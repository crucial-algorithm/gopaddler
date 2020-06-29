'use strict';

import Metric from './metric';
import Utils from '../utils/utils';

/**
 * @typedef {Object} FieldMetadata
 * @property {number} position
 * @property {string} type
 * @property {jQuery} $dom
 * @property {Metric} instance
 */

class Field {

    constructor(element, type, size, context, enableSplits) {
        var self = this;
        size = size || 'small';
        self.$element = $(element);
        self.createDomStructure(size, (enableSplits === true));
        self.speed = size === 'small' ? 300 : 200;

        self.$measures = self.$element.find('.measures');
        self.length = self.$measures.find('div').length;
        self.width = self.$element.width();

        /**@type Array<FieldMetadata*/
        self.positions = [];
        self.measures = {};
        /**@type FieldMetadata | null */
        self._current = null;
        self.context = context;
        self.convertToImperial = context.preferences().isImperial();

        self.options = {};

        self.init(type || 0, size);
    }

    createDomStructure(size, enableSplits) {
        this.$element.empty();

        if (size === 'small') {
            var dom = [
                '<div class="measures">',
                '    <div class="measure" data-type="timer"></div>',
                '    <div class="measure" data-type="splits"></div>',
                '    <div class="measure" data-type="speed"></div>',
                '    <div class="measure" data-type="averageSpeed"></div>',
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
                '    <div class="measure" data-type="averageSpeed"></div>',
                '    <div class="measure" data-type="distance"></div>',
                '    <div class="measure" data-type="pace"></div>',
                '    <div class="measure" data-type="spm"></div>',
                '    <div class="measure" data-type="efficiency"></div>',
                '    <div class="measure" data-type="strokes"></div>',
                '    <div class="measure" data-type="heartRate"></div>',
                '</div>'
            ].join('')).appendTo(this.$element);
        }
    }

    init(initialType, size) {
        const self = this;
        let position = 0;

        // index positions
        let $dom, type, instance, options;
        self.$measures.find('.measure').each(function (i, dom) {
            $dom = $(dom);
            type = $dom.data('type');

            if (type === initialType) position = i;

            options = FIELD_SETTINGS[type];

            instance = Metric.get(size, $dom, self.context.translate(options.label)
                , self.context.getUnit(type, size === 'large')
                , options.translate === true ? self.context.translate(options.init) : options.init
                , self.context.isPortraitMode()
                , options.formatter
            );
            instance.render(options.hint);
            self.positions[i] = {position: i, type: type, $dom: $dom, instance: instance};
            self.options[type] = options;
        });
        let deferred = $.Deferred();
        self.initialized = deferred.promise();

        // -- init slick and handle slick events
        setTimeout(function (position, initialType) {
            return function () {
                self.$measures.slick({
                    infinite: true,
                    arrows: false,
                    initialSlide: position,
                    speed: self.speed
                });

                deferred.resolve(Utils.enrichSlickWithActionsForGestureTips(self.$measures, self.speed));
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

    }

    animateTransition() {
        const self = this;
        setTimeout(function () {
            var $active = self.$element.find('.slick-active');
            $active.animate({marginLeft: $active.width() / 1.7 * -1}, 1000, undefined, function () {
                $active.animate({marginLeft: 0}, 1000);
            });
        }, 2000);

    }

    animateSwipeRight() {
        this.initialized.then(/**@param {Slider} slider */( slider) => {
            slider.next(2000);
            setTimeout(() => {
                slider.previous(1500);
            }, 2300);
        });
    }

    animateSwipeLeft() {
        this.initialized.then(/**@param {Slider} slider */( slider) => {
            slider.previous(2000);
            setTimeout(() => {
                slider.next(1500);
            }, 2500);
        });
    }

    _set(p) {
        this.current = this.positions[p];

        // to avoid seeing a sudden change in timer
        if (this.current.type === 'timer') {
            this.current.instance.setValue(this.time);
        }
    }

    getType() {
        return this.current.type;
    }

    convertInValueToDisplay(type, value) {
        const self = this;

        if (value === undefined)
            value = 0;

        if (self.convertToImperial) {
            if (type === 'speed')
                value = Utils.kmToMiles(value);
            if (type === 'distance')
                value = Utils.kmToMiles(value);
            if (type === 'efficiency')
                value = Utils.meterToFeet(value);
        }

        if (self.context.round(type))
            value = Utils.round(value, self.context.getUnitDecimalPlaces(type));


        return value;
    }

    /**
     * Set value of field. If type is not being currently rendered, it will just ignore
     *
     * @param type
     * @param value
     */
    setValue(type, value) {
        if (type === 'timer') {
            this.time = value;
        }

        if (type !== this.current.type) return;

        this.current.instance.setValue(this.convertInValueToDisplay(type, value));
    }

    setValues(values) {
        if (this.current.type in values) {
            this.setValue(this.current.type, values[this.current.type]);
        }

        if ('timer' in values) {
            this.time = values.timer;
        }
    }

    setUnit(type, unit) {
        if (this.current.type === type)
            this.current.instance.setUnit(unit);
    }

    get current() {
        return this._current || {};
    }

    set current(value) {
        this._current = value;
    }
}


const FIELD_SETTINGS = {
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
    averageSpeed: {
        label: "session_avg_speed",
        init: 0
    },
    distance: {
        label: "session_distance",
        init: 0,
        formatter(value) {
            if (value < 1000) return value;
            let output = [];
            let parts = (value + '').split(''), counter = 1;
            for (let i = parts.length - 1; i >=0; i--) {
                output.unshift(parts[i]);
                if (counter % 3 === 0) output.unshift(' ');
                counter++;
            }
            return output.join('').trim();
        }
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

export default Field;
