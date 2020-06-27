class SmallMetric {

    constructor($parent, label, unit, value, isPortraitMode, formatter) {
        this.$parent = $parent;
        this.label = label;
        this.unit = unit;
        this.defaultValue = value;
        this.isPortraitMode = isPortraitMode;
        this.formatter = formatter;
    }

    render(hint) {
        this.$parent.empty();

        var $template = $('#template-small-measure').children().clone(true);
        $template.appendTo(this.$parent);

        this.$parent.find('.small-measure-label').html(this.label);
        this.$parent.find('.small-measure-units').html(this.unit);

        this.$value = this.$parent.find('.small-measure-value');
        this.setValue(this.defaultValue);

        if (hint === true) {
            this.$value.addClass('blink');
            this.hintEnabled = true;
        }
    }

    setValue(value) {

        if ((value + '').length > 10) {
            this.$value.css({"font-size": "26px"});
            this.fontSizeChanged = true;
        } else if (this.fontSizeChanged) {
            this.$value.css({"font-size": ""});
            this.fontSizeChanged = false;
        }

        if (typeof value === "string") {
            this.$value.html(value);
        } else {
            value = this.formatter === null ? value : this.formatter(value)
            this.$value.text(value);
        }

        this.resetHint();
    }

    resetHint() {
        if (this.hintEnabled === false) return;

        this.$value.removeClass('blink');
        this.hintEnabled = false;
    }

    setUnit(unit) {
        this.$parent.find('.small-measure-units').html(unit);
    }
}



class LargeMetric {

    constructor($parent, label, unit, value, isPortraitMode, formatter) {
        this.$parent = $parent;
        this.label = label;
        this.unit = unit;
        this.defaultValue = value;
        this.isPortraitMode = isPortraitMode;
        this.formatter = formatter;

    }

    render() {
        this.$parent.empty();
        var $template = $('#template-large-measure').children().clone(true);
        $template.appendTo(this.$parent);

        this.$parent.find('.big-measure-label').html(this.label);
        this.$parent.find('.big-measure-units').html(this.unit);


        this.$value = this.$parent.find('.session-big-measure');
        this.setValue(this.defaultValue);
    }

    setValue(value) {
        if ((value + '').length > 10) {
            this.$value.css({"font-size": this.isPortraitMode ? "8vh" : "26px"});
            this.fontSizeChanged = true;
        } if ((value + '').length > 4) {
            this.$value.css({"font-size": this.isPortraitMode ? "18vh" : "19vw"});
            this.fontSizeChanged = true;
        } else if ((value + '').length > 3) {
            this.$value.css({"font-size": this.isPortraitMode ? "24vh" : "25vw"});
            this.fontSizeChanged = true;
        } else if ((value + '').length > 2) {
            this.$value.css({"font-size": this.isPortraitMode ? "30vh" : "30vw"});
            this.fontSizeChanged = true;
        } else if (value < 100 && this.fontSizeChanged) {
            this.$value.css({"font-size": ""});
            this.fontSizeChanged = false;
        }
        value = this.formatter === null ? value : this.formatter(value)
        this.$value.html(value);
    }

    setUnit() {}
}

class Metric {
    /**
     *
     * @param type
     * @param $parent
     * @param label
     * @param unit
     * @param defaultValue
     * @param isPortraitMode
     * @param formatter
     * @return {{render: function, setValue: function, setUnit: function}}
     */
    static get(type, $parent, label, unit, defaultValue, isPortraitMode, formatter = null) {
        if (type === 'small') {
            return new SmallMetric($parent, label, unit, defaultValue, isPortraitMode, formatter);
        } else {
            return new LargeMetric($parent, label, unit, defaultValue, isPortraitMode, formatter);
        }
    }
}

export default Metric;
