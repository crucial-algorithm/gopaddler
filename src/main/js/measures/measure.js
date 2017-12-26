function SmallMeasure($parent, label, unit, value, isPortraitMode) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;
    this.isPortraitMode = isPortraitMode;

}

SmallMeasure.prototype.render = function (hint) {
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
};

SmallMeasure.prototype.setValue = function (value) {

    if ((value + '').length > 10) {
        this.$value.css({"font-size": "26px"});
        this.fontSizeChanged = true;
    } else if (this.fontSizeChanged) {
        this.$value.css({"font-size": ""});
        this.fontSizeChanged = false;
    }

    this.$value.text(value);
    this.resetHint();
};

SmallMeasure.prototype.resetHint = function () {
    if (this.hintEnabled === false) return;

    this.$value.removeClass('blink');
    this.hintEnabled = false;
};

SmallMeasure.prototype.setUnit = function (unit) {
    this.$parent.find('.small-measure-units').html(unit);
};


function LargeMeasure($parent, label, unit, value, isPortraitMode) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;
    this.isPortraitMode = isPortraitMode;

}

LargeMeasure.prototype.render = function () {
    this.$parent.empty();
    var $template = $('#template-large-measure').children().clone(true);
    $template.appendTo(this.$parent);

    this.$parent.find('.big-measure-label').html(this.label);
    this.$parent.find('.big-measure-units').html(this.unit);


    this.$value = this.$parent.find('.session-big-measure');
    this.setValue(this.defaultValue);
};

LargeMeasure.prototype.setValue = function (value) {
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
        this.$value.css({"font-size": null});
        this.fontSizeChanged = false;
    }

    this.$value.html(value);
};

LargeMeasure.prototype.setUnit = function () {};

function Measure() {
}

Measure.get = function (type, $parent, label, unit, defaultValue, isPortraitMode) {
    if (type === 'small') {
        return new SmallMeasure($parent, label, unit, defaultValue, isPortraitMode);
    } else {
        return new LargeMeasure($parent, label, unit, defaultValue, isPortraitMode);
    }
};

exports.Measure = Measure;
