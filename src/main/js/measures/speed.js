'use strict';
var utils = require('../utils/utils');

function Speed() {
    this.value = 0;
    this.lastDistance = undefined;
    this.lastPosition = undefined;
}


Speed.prototype.calculate = function (position, distance) {
    if (this.lastDistance === undefined) {
        this.lastDistance = distance;
        this.lastPosition = position;
        return this.value;
    }

    // don't display speed until we reach 10 meters
    if (this.lastDistance === distance || distance <= 0.01) {
        return this.value;
    }

    var diff = distance - this.lastDistance;
   
    // don't update speed until we have moved at least 10 meters
    if (diff < 0.01)
        return this.value;
    
    var hours = (position.timestamp - this.lastPosition.timestamp) / 1000 / 60 / 60;
    this.value = diff * (1 / hours);

    this.lastDistance = distance;
    this.lastPosition = position;
    
    return this.value;
};

Speed.prototype.reset = function () {
    this.value = 0;
};

Speed.prototype.getValue = function () {
    return this.value;
};

exports.Speed = Speed;