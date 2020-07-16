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
        const str = (this.formatter === null ? value : this.formatter(value)) + '';

        let length = [ {port: '0', land: '0'}
        , /* length =  1 */ {port: '38vh', land: '40vw'}
        , /* length =  2 */ {port: '38vh', land: '40vw'}
        , /* length =  3 */ {port: '30vh', land: '28vw'}
        , /* length =  4 */ {port: '24vh', land: '20vw'}
        , /* length =  5 */ {port: '18vh', land: '16vw'}
        , /* length =  6 */ {port: '18vh', land: '14vw'}
        , /* length =  7 */ {port: '15vh', land: '12vw'}
        , /* length =  8 */ {port: '15vh', land: '10vw'}
        , /* length =  9 */ {port: '12vh', land:  '9vw'}
        , /* length = 10 */ {port: '10vh', land:  '8vw'}
        , /* length = 11 */ {port:  '8vh', land:  '6vw'}
        , /* length = 12 */ {port:  '8vh', land:  '6vw'}
        , /* length = 13 */ {port:  '8vh', land:  '6vw'}
        , /* length = 14 */ {port:  '8vh', land:  '6vw'}
            ];

        let fontSize = length[str.length];
        if (!fontSize) {
            this.$value.css({"font-size": ""});
        } else {
            this.$value.css({"font-size": this.isPortraitMode ? fontSize.port : fontSize.land});
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
