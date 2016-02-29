function SmallMeasure($parent, label, unit, value) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;

};

SmallMeasure.prototype.render = function () {
    this.$parent.empty();

    var $template = $('#template-small-measure').children().clone(true);
    $template.appendTo(this.$parent);

    this.$parent.find('.small-measure-label').html(this.label);
    this.$parent.find('.small-measure-units').html(this.unit);

    this.$value = this.$parent.find('.small-measure-value');
    this.$value.html(this.defaultValue);
};

SmallMeasure.prototype.setValue = function (value) {
    this.$value.html(value);
};


function LargeMeasure($parent, label, unit, value) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;

};

LargeMeasure.prototype.render = function () {
    this.$parent.empty();
    var $template = $('#template-large-measure').children().clone(true);
    $template.appendTo(this.$parent);

    this.$parent.find('.big-measure-label').html(this.label);
    this.$parent.find('.big-measure-units').html(this.unit);


    this.$value = this.$parent.find('.session-big-measure');
    this.$value.html(this.defaultValue);
};

LargeMeasure.prototype.setValue = function (value) {
    if ((value + '').length > 4) {
        this.$value.css({"font-size": "19vw"});
        this.fontSizeChanged = true;
    } else if ((value + '').length > 3) {
        this.$value.css({"font-size": "25vw"});
        this.fontSizeChanged = true;
    } else if ((value + '').length > 2) {
        this.$value.css({"font-size": "30vw"});
        this.fontSizeChanged = true;
    } else if (value < 100 && this.fontSizeChanged) {
        this.$value.css({"font-size": null});
        this.fontSizeChanged = false;
    }

    this.$value.html(value);
};

function Measure(){}

Measure.get = function (type, $parent, label, unit, defaultValue) {
    if (type === 'small') {
        return new SmallMeasure($parent, label, unit, defaultValue);
    } else {
        return new LargeMeasure($parent, label, unit, defaultValue);
    }
};

exports.Measure = Measure;