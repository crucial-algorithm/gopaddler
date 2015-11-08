function SmallMeasure($parent, label, unit, value) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;

}

SmallMeasure.prototype.render = function () {
    this.$parent.empty();

    var $template = $('#measure').children().clone(true);
    $template.appendTo(this.$parent);

    this.$parent.find('.small-measure-label').html(this.label);
    this.$parent.find('.small-measure-units').html(this.unit);

    this.$value = this.$parent.find('.small-measure-value');
    this.$value.html(this.defaultValue);
}

SmallMeasure.prototype.setValue = function (value) {
    this.$value.html(value);
}


function LargeMeasure($parent, label, unit, value) {
    this.$parent = $parent;
    this.label = label;
    this.unit = unit;
    this.defaultValue = value;

}

LargeMeasure.prototype.render = function () {
    this.$value = this.$parent.find('.session-big-measure');
    this.$value.html(this.defaultValue);
}

LargeMeasure.prototype.setValue = function (value) {
    this.$value.html(value);
}

function Measure(){}

Measure.get = function (type, $parent, label, unit, defaultValue) {
    if (type === 'small') {
        return new SmallMeasure($parent, label, unit, defaultValue);
    } else {
        return new LargeMeasure($parent, label, unit, defaultValue);
    }
}