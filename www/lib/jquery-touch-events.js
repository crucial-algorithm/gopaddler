/*!
 * jQuery Mobile Events
 * By: Sam Delgado (http://offcolorapp.com), Ben Major (http://www.ben-major.co.uk), and hachigoro (https://github.com/hachigoro)
 *
 * Copyright 2011, Ben Major - Copyright 2015, Sam Delgado
 * Licensed under the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

var $ = window.$ || global.$ || require('jquery');

$.attrFn = $.attrFn || {};

// navigator.userAgent.toLowerCase() isn't reliable for Chrome installs
// on mobile devices. As such, we will create a boolean isChromeDesktop
// The reason that we need to do this is because Chrome annoyingly
// purports support for touch events even if the underlying hardware
// does not!
var agent = navigator.userAgent.toLowerCase();

var isChromeDesktop = (agent.indexOf('chrome') > -1 && ((agent.indexOf('windows') > -1) || (agent.indexOf('macintosh') > -1) || (agent.indexOf('linux') > -1)) && agent.indexOf('mobile') < 0 && agent.indexOf('android') < 0);

var settings = {
    tap_pixel_range: 5,
    swipe_h_threshold: 50,
    swipe_v_threshold: 50,
    taphold_threshold: 750,

    touch_capable: (window.navigator.msPointerEnabled) ? false : ('ontouchstart' in window && !isChromeDesktop),
    orientation_support: ('orientation' in window && 'onorientationchange' in window),

    startevent: (window.navigator.msPointerEnabled) ? 'MSPointerDown' : (('ontouchstart' in window && !isChromeDesktop) ? 'touchstart' : 'mousedown'),
    endevent: (window.navigator.msPointerEnabled) ? 'MSPointerUp'   : (('ontouchstart' in window && !isChromeDesktop) ? 'touchend' : 'mouseup'),
    moveevent: (window.navigator.msPointerEnabled) ? 'MSPointerMove' : (('ontouchstart' in window && !isChromeDesktop) ? 'touchmove' : 'mousemove'),
    tapevent: ('ontouchstart' in window && !isChromeDesktop) ? 'tap' : 'click',
    scrollevent: ('ontouchstart' in window && !isChromeDesktop) ? 'touchmove' : 'scroll',

    hold_timer: null,
    tap_timer: null
};

// Convenience functions:
$.isTouchCapable = function() { return settings.touch_capable; };
$.getStartEvent = function() { return settings.startevent; };
$.getEndEvent = function() { return settings.endevent; };
$.getMoveEvent = function() { return settings.moveevent; };
$.getTapEvent = function() { return settings.tapevent; };
$.getScrollEvent = function() { return settings.scrollevent; };

// Add Event shortcuts:
$.each(['tapstart', 'tapend', 'tapmove', 'tap', 'tap2', 'tap3', 'tap4', 'hold', 'swipe', 'swipeup', 'swiperight', 'swipedown', 'swipeleft', 'swipeend', 'scrollstart', 'scrollend', 'orientationchange'], function (i, name) {

    $.fn[name] = function (fn) {
        return fn ? this.on(name, fn) : this.trigger(name);
    };

    $.attrFn[name] = true;

});

// tapstart Event:
$.event.special.tapstart = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);

        $this.on(settings.startevent, function tapStartFunc(e) {

            $this.data('callee', tapStartFunc);

            if (e.which && e.which !== 1) {
                return false;
            }

            var origEvent = e.originalEvent;
            var touchData = {
                'position': {
                    'x': ((settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX),
                    'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                },
                'offset': {
                    'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                },
                'time': Date.now(),
                'target': e.target
            };

            triggerCustomEvent(thisObject, 'tapstart', e, touchData);
            return true;

        });

    },

    remove: function () {
        $(this).off(settings.startevent, $(this).data.callee);
    }

};

// tapmove Event:
$.event.special.tapmove = {

    setup: function() {

        var thisObject = this;
        var $this = $(thisObject);

        $this.on(settings.moveevent, function tapMoveFunc(e) {

            $this.data('callee', tapMoveFunc);

            var origEvent = e.originalEvent;
            var touchData = {
                'position': {
                    'x': ((settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX),
                    'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                },
                'offset': {
                    'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                },
                'time': Date.now(),
                'target': e.target
            };

            triggerCustomEvent(thisObject, 'tapmove', e, touchData);
            return true;

        });

    },

    remove: function() {
        $(this).off(settings.moveevent, $(this).data.callee);
    }

};

// tapend Event:
$.event.special.tapend = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);

        $this.on(settings.endevent, function tapEndFunc(e) {

            // Touch event data:
            $this.data('callee', tapEndFunc);

            var origEvent = e.originalEvent;
            var touchData = {
                'position': {
                    'x': (settings.touch_capable) ? origEvent.changedTouches[0].screenX : e.screenX,
                    'y': (settings.touch_capable) ? origEvent.changedTouches[0].screenY : e.screenY
                },
                'offset': {
                    'x': (settings.touch_capable) ? origEvent.changedTouches[0].pageX - origEvent.changedTouches[0].target.offsetLeft : e.offsetX,
                    'y': (settings.touch_capable) ? origEvent.changedTouches[0].pageY - origEvent.changedTouches[0].target.offsetTop : e.offsetY
                },
                'time': Date.now(),
                'target': e.target
            };

            triggerCustomEvent(thisObject, 'tapend', e, touchData);
            return true;

        });

    },

    remove: function () {
        $(this).off(settings.endevent, $(this).data.callee);
    }

};

// hold Event:
$.event.special.hold = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);
        var origTarget;
        var start_pos = {x: 0, y: 0};
        var end_x = 0;
        var end_y = 0;

        $this.on(settings.startevent, function tapHoldFunc1(e) {

            if (e.which && e.which !== 1) {
                return false;
            } else {

                $this.data('tapheld', false);
                origTarget = e.target;

                var origEvent = e.originalEvent;
                var start_time = Date.now();

                var startPosition = {
                    'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                };

                var startOffset = {
                    'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                };

                start_pos.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
                start_pos.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;

                end_x = start_pos.x;
                end_y = start_pos.y;

                settings.hold_timer = window.setTimeout(function () {

                    var diff_x = (start_pos.x - end_x);
                    var diff_y = (start_pos.y - end_y);

                    if (e.target == origTarget && ((start_pos.x == end_x && start_pos.y == end_y) || (diff_x >= -(settings.tap_pixel_range) && diff_x <= settings.tap_pixel_range && diff_y >= -(settings.tap_pixel_range) && diff_y <= settings.tap_pixel_range))) {

                        $this.data('tapheld', true);

                        var end_time = Date.now();

                        var endPosition = {
                            'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                        };

                        var endOffset = {
                            'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                        };

                        var duration = end_time - start_time;

                        // Build the touch data:
                        var touchData = {
                            'startTime': start_time,
                            'endTime': end_time,
                            'startPosition': startPosition,
                            'startOffset': startOffset,
                            'endPosition': endPosition,
                            'endOffset': endOffset,
                            'duration': duration,
                            'target': e.target
                        };

                        $this.data('callee1', tapHoldFunc1);
                        triggerCustomEvent(thisObject, 'hold', e, touchData);

                    }

                }, settings.taphold_threshold);

                return true;

            }

        })

            .on(settings.endevent, function tapHoldFunc2() {

                $this.data('callee2', tapHoldFunc2);
                $this.data('tapheld', false);
                window.clearTimeout(settings.hold_timer);

            })

            .on(settings.moveevent, function tapHoldFunc3(e) {

                $this.data('callee3', tapHoldFunc3);

                end_x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
                end_y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;

            });

    },

    remove: function () {
        $(this).off(settings.startevent, $(this).data.callee1).off(settings.endevent, $(this).data.callee2).off(settings.moveevent, $(this).data.callee3);
    }

};

// tap Event:
$.event.special.tap = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);
        var started = false;
        var origTarget = null;
        var start_time;
        var start_pos = {x: 0, y: 0};
        var touches;

        $this.on(settings.startevent, function tapFunc1(e) {

            $this.data('callee1', tapFunc1);

            if (e.which && e.which !== 1) {
                return false;
            } else {

                started = true;
                start_pos.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
                start_pos.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;
                start_time = Date.now();
                origTarget = e.target;

                touches = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches : [ e ];
                return true;

            }

        })

            .on(settings.endevent, function tapFunc2(e) {

                $this.data('callee2', tapFunc2);

                // Only trigger if they've started, and the target matches:
                var end_x = (e.originalEvent.targetTouches) ? e.originalEvent.changedTouches[0].pageX : e.pageX;
                var end_y = (e.originalEvent.targetTouches) ? e.originalEvent.changedTouches[0].pageY : e.pageY;
                var diff_x = (start_pos.x - end_x);
                var diff_y = (start_pos.y - end_y);
                var eventName;

                if (origTarget == e.target && started && ((Date.now() - start_time) < settings.taphold_threshold) && ((start_pos.x == end_x && start_pos.y == end_y) || (diff_x >= -(settings.tap_pixel_range) && diff_x <= settings.tap_pixel_range && diff_y >= -(settings.tap_pixel_range) && diff_y <= settings.tap_pixel_range))) {

                    var origEvent = e.originalEvent;
                    var touchData = [];

                    for (var i=0; i<touches.length; i++) {

                        var touch = {
                            'position': {
                                'x': (settings.touch_capable) ? origEvent.changedTouches[i].screenX : e.screenX,
                                'y': (settings.touch_capable) ? origEvent.changedTouches[i].screenY : e.screenY
                            },
                            'offset': {
                                'x': (settings.touch_capable) ? origEvent.changedTouches[i].pageX - origEvent.changedTouches[i].target.offsetLeft : e.offsetX,
                                'y': (settings.touch_capable) ? origEvent.changedTouches[i].pageY - origEvent.changedTouches[i].target.offsetTop : e.offsetY
                            },
                            'time': Date.now(),
                            'target': e.target
                        };

                        touchData.push(touch);

                    }

                    switch (touches.length) {
                        case 1:
                            eventName = 'tap';
                            break;

                        case 2:
                            eventName = 'tap2';
                            break;

                        case 3:
                            eventName = 'tap3';
                            break;

                        case 4:
                            eventName = 'tap4';
                            break;
                    }

                    triggerCustomEvent(thisObject, eventName, e, touchData);

                }

            });

    },

    remove: function () {
        $(this).off(settings.startevent, $(this).data.callee1).off(settings.endevent, $(this).data.callee2);
    }

};

// swipe Event (also handles swipeup, swiperight, swipedown and swipeleft):
$.event.special.swipe = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);
        var started = false;
        var hasSwiped = false;
        var originalCoord = {x: 0, y: 0};
        var finalCoord = {x: 0, y: 0};
        var startEvnt;

        // Screen touched, store the original coordinate

        function touchStart(e) {

            $this = $(e.currentTarget);
            $this.data('callee1', touchStart);
            originalCoord.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
            originalCoord.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;
            finalCoord.x = originalCoord.x;
            finalCoord.y = originalCoord.y;
            started = true;
            var origEvent = e.originalEvent;

            // Read event data into our startEvt:
            startEvnt = {
                'position': {
                    'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                },
                'offset': {
                    'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                    'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                },
                'time': Date.now(),
                'target': e.target
            };

        }

        // Store coordinates as finger is swiping

        function touchMove(e) {

            $this = $(e.currentTarget);
            $this.data('callee2', touchMove);
            finalCoord.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
            finalCoord.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;

            var swipedir;

            // We need to check if the element to which the event was bound contains a data-xthreshold | data-vthreshold:
            var ele_x_threshold = ($this.parent().data('xthreshold')) ? $this.parent().data('xthreshold') : $this.data('xthreshold'),
                ele_y_threshold = ($this.parent().data('ythreshold')) ? $this.parent().data('ythreshold') : $this.data('ythreshold'),
                h_threshold = (typeof ele_x_threshold !== 'undefined' && ele_x_threshold !== false && parseInt(ele_x_threshold)) ? parseInt(ele_x_threshold) : settings.swipe_h_threshold,
                v_threshold = (typeof ele_y_threshold !== 'undefined' && ele_y_threshold !== false && parseInt(ele_y_threshold)) ? parseInt(ele_y_threshold) : settings.swipe_v_threshold;

            if (originalCoord.y > finalCoord.y && (originalCoord.y - finalCoord.y > v_threshold)) {
                swipedir = 'swipeup';
            }
            if (originalCoord.x < finalCoord.x && (finalCoord.x - originalCoord.x > h_threshold)) {
                swipedir = 'swiperight';
            }
            if (originalCoord.y < finalCoord.y && (finalCoord.y - originalCoord.y > v_threshold)) {
                swipedir = 'swipedown';
            }
            if (originalCoord.x > finalCoord.x && (originalCoord.x - finalCoord.x > h_threshold)) {
                swipedir = 'swipeleft';
            }
            if (swipedir != undefined && started) {
                originalCoord.x = 0;
                originalCoord.y = 0;
                finalCoord.x = 0;
                finalCoord.y = 0;
                started = false;

                // Read event data into our endEvnt:
                var origEvent = e.originalEvent;
                var endEvnt = {
                    'position': {
                        'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                        'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                    },
                    'offset': {
                        'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                        'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                    },
                    'time': Date.now(),
                    'target': e.target
                };

                // Calculate the swipe amount (normalized):
                var xAmount = Math.abs(startEvnt.position.x - endEvnt.position.x),
                    yAmount = Math.abs(startEvnt.position.y - endEvnt.position.y);

                var touchData = {
                    'startEvnt': startEvnt,
                    'endEvnt': endEvnt,
                    'direction': swipedir.replace('swipe', ''),
                    'xAmount': xAmount,
                    'yAmount': yAmount,
                    'duration': endEvnt.time - startEvnt.time
                };
                hasSwiped = true;
                $this.trigger('swipe', touchData).trigger(swipedir, touchData);
            }

        }

        function touchEnd(e) {

            $this = $(e.currentTarget);
            var swipedir = "";
            $this.data('callee3', touchEnd);

            if (hasSwiped) {

                // We need to check if the element to which the event was bound contains a data-xthreshold | data-vthreshold:
                var ele_x_threshold = $this.data('xthreshold'),
                    ele_y_threshold = $this.data('ythreshold'),
                    h_threshold = (typeof ele_x_threshold !== 'undefined' && ele_x_threshold !== false && parseInt(ele_x_threshold)) ? parseInt(ele_x_threshold) : settings.swipe_h_threshold,
                    v_threshold = (typeof ele_y_threshold !== 'undefined' && ele_y_threshold !== false && parseInt(ele_y_threshold)) ? parseInt(ele_y_threshold) : settings.swipe_v_threshold;

                var origEvent = e.originalEvent;
                var endEvnt = {
                    'position': {
                        'x': (settings.touch_capable) ? origEvent.changedTouches[0].screenX : e.screenX,
                        'y': (settings.touch_capable) ? origEvent.changedTouches[0].screenY : e.screenY
                    },
                    'offset': {
                        'x': (settings.touch_capable) ? origEvent.changedTouches[0].pageX - origEvent.changedTouches[0].target.offsetLeft : e.offsetX,
                        'y': (settings.touch_capable) ? origEvent.changedTouches[0].pageY - origEvent.changedTouches[0].target.offsetTop : e.offsetY
                    },
                    'time': Date.now(),
                    'target': e.target
                };

                // Read event data into our endEvnt:
                if (startEvnt.position.y > endEvnt.position.y && (startEvnt.position.y - endEvnt.position.y > v_threshold)) {
                    swipedir = 'swipeup';
                }
                if (startEvnt.position.x < endEvnt.position.x && (endEvnt.position.x - startEvnt.position.x > h_threshold)) {
                    swipedir = 'swiperight';
                }
                if (startEvnt.position.y < endEvnt.position.y && (endEvnt.position.y - startEvnt.position.y > v_threshold)) {
                    swipedir = 'swipedown';
                }
                if (startEvnt.position.x > endEvnt.position.x && (startEvnt.position.x - endEvnt.position.x > h_threshold)) {
                    swipedir = 'swipeleft';
                }

                // Calculate the swipe amount (normalized):
                var xAmount = Math.abs(startEvnt.position.x - endEvnt.position.x),
                    yAmount = Math.abs(startEvnt.position.y - endEvnt.position.y);

                var touchData = {
                    'startEvnt': startEvnt,
                    'endEvnt': endEvnt,
                    'direction': swipedir.replace('swipe', ''),
                    'xAmount': xAmount,
                    'yAmount': yAmount,
                    'duration': endEvnt.time - startEvnt.time
                };
                $this.trigger('swipeend', touchData);

            }

            started = false;
            hasSwiped = false;

        }

        $this.on(settings.startevent, touchStart);
        $this.on(settings.moveevent, touchMove);
        $this.on(settings.endevent, touchEnd);

    },

    remove: function () {
        $(this).off(settings.startevent, $(this).data.callee1).off(settings.moveevent, $(this).data.callee2).off(settings.endevent, $(this).data.callee3);
    }

};

// scrollstart Event (also handles scrollend):
$.event.special.scrollstart = {

    setup: function () {

        var thisObject = this;
        var $this = $(thisObject);
        var scrolling;
        var timer;

        function trigger(event, state) {
            scrolling = state;
            triggerCustomEvent(thisObject, scrolling ? 'scrollstart' : 'scrollend', event);
        }

        // iPhone triggers scroll after a small delay; use touchmove instead
        $this.on(settings.scrollevent, function scrollFunc(event) {

            $this.data('callee', scrollFunc);

            if (!scrolling) {
                trigger(event, true);
            }

            clearTimeout(timer);

            timer = setTimeout(function () {
                trigger(event, false);
            }, 50);

        });

    },

    remove: function () {
        $(this).off(settings.scrollevent, $(this).data.callee);
    }

};

// This is the orientation change (largely borrowed from jQuery Mobile):
var win = $(window);
var special_event;
var get_orientation;
var last_orientation;
var initial_orientation_is_landscape;
var initial_orientation_is_default;
var portrait_map = {
    '0': true,
    '180': true
};

if (settings.orientation_support) {

    var ww = window.innerWidth || win.width();
    var wh = window.innerHeight || win.height();
    var landscape_threshold = 50;

    initial_orientation_is_landscape = ww > wh && (ww - wh) > landscape_threshold;
    initial_orientation_is_default = portrait_map[window.orientation];

    if ((initial_orientation_is_landscape && initial_orientation_is_default) || (!initial_orientation_is_landscape && !initial_orientation_is_default)) {

        portrait_map = {
            '-90': true,
            '90': true
        };

    }

}

$.event.special.orientationchange = special_event = {

    setup: function () {

        // If the event is supported natively, return false so that jQuery
        // will on to the event using DOM methods.
        if (settings.orientation_support) {
            return false;
        }

        // Get the current orientation to avoid initial double-triggering.
        last_orientation = get_orientation();

        win.on('throttledresize', handler);
        return true;

    },

    teardown: function () {

        if (settings.orientation_support) {
            return false;
        }

        win.off('throttledresize', handler);
        return true;

    },

    add: function (handleObj) {

        // Save a reference to the bound event handler.
        var old_handler = handleObj.handler;

        handleObj.handler = function (event) {
            event.orientation = get_orientation();
            return old_handler.apply(this, arguments);
        };

    }

};

// If the event is not supported natively, this handler will be bound to
// the window resize event to simulate the orientationchange event.

function handler() {

    // Get the current orientation.
    var orientation = get_orientation();

    if (orientation !== last_orientation) {
        // The orientation has changed, so trigger the orientationchange event.
        last_orientation = orientation;
        win.trigger("orientationchange");
    }

}

$.event.special.orientationchange.orientation = get_orientation = function () {

    var isPortrait = true;
    var elem = document.documentElement;

    if (settings.orientation_support) {
        isPortrait = portrait_map[window.orientation];
    } else {
        isPortrait = elem && elem.clientWidth / elem.clientHeight < 1.1;
    }

    return isPortrait ? 'portrait' : 'landscape';

};

// throttle Handler:
$.event.special.throttledresize = {

    setup: function () {
        $(this).on('resize', throttle_handler);
    },

    teardown: function () {
        $(this).off('resize', throttle_handler);
    }

};

var throttle = 250;
var lastCall = 0;
var heldCall;
var curr;
var diff;

var throttle_handler = function () {

    curr = Date.now();
    diff = curr - lastCall;

    if (diff >= throttle) {

        lastCall = curr;
        $(this).trigger('throttledresize');

    } else {

        if (heldCall) {
            window.clearTimeout(heldCall);
        }

        // Promise a held call will still execute
        heldCall = window.setTimeout(handler, throttle - diff);

    }

};

// Trigger a custom event:
function triggerCustomEvent(obj, eventType, event, touchData) {

    var originalType = event.type;
    event.type = eventType;

    $.event.dispatch.call(obj, event, touchData);
    event.type = originalType;

}

// Correctly on anything we've overloaded:
$.each({

    scrollend: 'scrollstart',
    swipeup: 'swipe',
    swiperight: 'swipe',
    swipedown: 'swipe',
    swipeleft: 'swipe',
    swipeend: 'swipe',
    tap2: 'tap'

}, function (e, srcE) {

    $.event.special[e] = {

        setup: function () {
            $(this).on(srcE, $.noop);
        }

    };

});