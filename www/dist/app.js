/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var SessionView = __webpack_require__(1).SessionView;
	var SessionSummaryView = __webpack_require__(19).SessionSummaryView;
	var SettingsView = __webpack_require__(20).SettingsView;
	var HomeView = __webpack_require__(22).HomeView;
	var LoginView = __webpack_require__(23).LoginView;
	var SessionsView = __webpack_require__(24).SessionsView;
	var CalibrationView = __webpack_require__(25).CalibrationView;
	var CalibrationHelpView = __webpack_require__(27).CalibrationHelpView;
	var SessionTipsView = __webpack_require__(28).SessionTipsView;
	var Api = __webpack_require__(10);
	var utils = __webpack_require__(4);
	var global = __webpack_require__(29);
	var db = __webpack_require__(8);
	var sync = __webpack_require__(30);
	var analytics = __webpack_require__(31);
	var Settings = __webpack_require__(21);
	var Context = __webpack_require__(32).Context;
	
	var settings = undefined;
	var context = undefined;
	
	
	/**
	 * Splash screen / login page.
	 */
	App.controller('login', function (page) {
	    analytics.setView('login');
	    screen.lockOrientation('portrait');
	    new LoginView(page);
	});
	
	App.controller('home', function (page, request) {
	    analytics.setView('home');
	    analytics.setUser(Api.User.getId());
	    screen.lockOrientation('landscape-secondary');
	    Settings.loadSettings().then(function (s) {
	        settings = s;
	        context = new Context(settings);
	        new HomeView(page, context, request);
	    }).fail(function (error, defaultSettings) {
	            settings = defaultSettings;
	            context = new Context(settings);
	        });
	});
	
	/**
	 * New session page.
	 */
	App.controller('session', function (page) {
	    analytics.setView('session');
	    new SessionView(page, context);
	});
	
	App.controller('session-summary', function (page, session) {
	    analytics.setView('session-summary');
	    new SessionSummaryView(page, context, session);
	});
	
	/**
	 * Settings page.
	 */
	App.controller('settings', function (page) {
	    analytics.setView('settings');
	    new SettingsView(page, settings);
	});
	
	/**
	 * Session list page.
	 */
	App.controller('sessions', function (page) {
	    analytics.setView('sessions');
	    new SessionsView(page, context);
	});
	
	/**
	 * Calibration page.
	 */
	App.controller('calibration', function (page, request) {
	    analytics.setView('calibration');
	    new CalibrationView(page, context, request);
	});
	
	/**
	 * Pause and swipe session tutorial page.
	 */
	App.controller('session-basic-touch-tutorial', function (page) {
	    analytics.setView('session-touch-tips-tutorial');
	    new SessionTipsView(page, context);
	});
	
	/**
	 * Calibration tutorial
	 */
	App.controller('calibration-help', function (page, request) {
	    analytics.setView('calibration-help');
	    new CalibrationHelpView(page, context, request);
	});
	
	function onDeviceReady() {
	    document.pd_device_ready = true;
	
	    utils.mapBrowserToNative();
	
	    loadDb();
	
	    setTimeout(function () {
	        loadUi();
	    }, 2000);
	}
	
	if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
	    document.addEventListener("deviceready", onDeviceReady, false);
	} else {
	    // in browser, development mode!
	    global.emulateCordova();
	    loadDb();
	    Api.User.set({
	        _id: -1,
	        profile: {
	            name: 'local-test-user'
	        }
	    });
	    // go direct to home, without going through authentication
	    App.load('home');
	}
	
	function loadDb() {
	    db.init();
	    sync.start();
	}
	
	function loadUi() {
	
	    analytics.init();
	
	    Api.Auth.login().done(function () {
	        App.load('home');
	    }).fail(function () {
	        App.load('login');
	    });
	}


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var IO = __webpack_require__(2).IO;
	var GPS = __webpack_require__(3).GPS;
	var Dialog = __webpack_require__(5);
	var utils = __webpack_require__(4);
	var Calibration = __webpack_require__(6).Calibration;
	var Session = __webpack_require__(7).Session;
	var SessionDetail = __webpack_require__(9).SessionDetail;
	var db = __webpack_require__(8).Session;
	var Api = __webpack_require__(10);
	var StrokeDetector = __webpack_require__(11).StrokeDetector;
	var Timer = __webpack_require__(12).Timer;
	var Distance = __webpack_require__(13).Distance;
	var Speed = __webpack_require__(14).Speed;
	var Pace = __webpack_require__(15).Pace;
	
	var StrokeEfficiency = __webpack_require__(16).StrokeEfficiency;
	
	var Field = __webpack_require__(17).Field;
	
	var DEFAULT_POSITIONS = {
	    top: 'timer',
	    middle: 'speed',
	    bottom: 'distance',
	    large: 'spm'
	};
	
	var SMALL = 'small', LARGE = 'large';
	
	function SessionView(page, context) {
	    var self = this;
	    self.isDebugEnabled = !!Api.User.getProfile().debug;
	
	    var $page = $(page);
	    var calibration = Calibration.load() || Calibration.blank();
	    var session = self.createSession(calibration);
	    var gps = new GPS();
	    var distance = new Distance();
	    var speed = new Speed();
	    var pace = new Pace(context.preferences().isImperial());
	    var strokeEfficiency = new StrokeEfficiency();
	    var strokeDetector = new StrokeDetector(session, calibration, null, self.debug(session));
	    var paused = false;
	
	
	    document.PREVENT_SYNC = true;
	
	    var fields;
	    if (context.preferences().isRestoreLayout()) {
	        fields = loadLayout();
	    } else {
	        fields = DEFAULT_POSITIONS;
	    }
	
	    var top = new Field($('.session-small-measure.yellow', page), fields.top, SMALL, context);
	    var middle = new Field($('.session-small-measure.blue', page), fields.middle, SMALL, context);
	    var bottom = new Field($('.session-small-measure.red', page), fields.bottom, SMALL, context);
	    var large = new Field($('.session-left', page), fields.large, LARGE, context);
	
	
	    // prevent drag using touch during session
	    var preventDrag = function (e) {
	        e.preventDefault();
	    };
	    document.addEventListener('touchmove', preventDrag, false);
	
	    $(window).on('scroll.scrolldisabler', function (event) {
	        $(window).scrollTop(0);
	        event.preventDefault();
	    });
	
	
	    $(window).on('touchmove', function (e) {
	        e.preventDefault();
	    });
	
	
	    // -- initiate timer
	    var timer = new Timer();
	    timer.start(function (value) {
	        if (paused) return;
	        top.setValue("timer", value);
	        middle.setValue("timer", value);
	        bottom.setValue("timer", value);
	        large.setValue("timer", value);
	    });
	
	
	
	    // -- Handle GPS sensor data
	    var lastEfficiency = 0, lastInterval = 0, lastDisplayedSpeed = 0, lastGpsAt = 0;
	    gps.listen(function (position) {
	        if (paused) return;
	
	        var values = {speed: 0, pace: 0, efficiency: 0, distance:0};
	
	        values.distance = distance.calculate(position);
	        values.speed = lastDisplayedSpeed = speed.calculate(position, values.distance);
	        values.efficiency = lastEfficiency = strokeEfficiency.calculate(values.speed, lastInterval);
	        values.pace = pace.calculate(values.speed);
	
	        top.setValues(values);
	        middle.setValues(values);
	        bottom.setValues(values);
	        large.setValues(values);
	
	        lastGpsAt = position.timestamp;
	
	    });
	
	    var resetGpsData = function () {
	        var values = {speed: 0, pace: 0, efficiency: 0};
	        speed.reset();
	
	        top.setValues(values);
	        middle.setValues(values);
	        bottom.setValues(values);
	        large.setValues(values);
	    };
	
	    // -- handle stroke related data
	    var now;
	    strokeDetector.onStrokeRateChanged(function (spm, interval) {
	        if (paused) return;
	
	        // update fields using spm and efficiency
	        top.setValue('spm', spm);
	        middle.setValue('spm', spm);
	        bottom.setValue('spm', spm);
	        large.setValue('spm', spm);
	
	        // store data
	        now  = new Date().getTime();
	        new SessionDetail(session.getId(), now, distance.getValue(), lastDisplayedSpeed, spm
	            , lastEfficiency, distance.getLatitude(), distance.getLongitude()
	        ).save();
	
	        lastInterval = interval;
	
	        // this should not be here, but its the easiest way considering that stroke rate is updated every 1.5 sec
	        if (now - lastGpsAt > 5000) {
	            resetGpsData();
	        }
	    });
	    strokeDetector.start();
	
	    var back = function () {
	        if (context.preferences().isRestoreLayout()) {
	            saveLayout(top.getType(), middle.getType(), bottom.getType(), large.getType());
	        } else {
	            resetLayout();
	        }
	
	        document.removeEventListener('touchmove', preventDrag, false);
	
	        App.load('session-summary', { session: session, isPastSession: false }, undefined, function () {
	            App.removeFromStack();
	        });
	    };
	
	    var tx = false;
	    var clear = function () {
	        tx = true;
	        document.PREVENT_SYNC = false;
	
	        clearInterval(self.intervalId);
	        clearInterval(self.speedIntervalId);
	        timer.stop();
	        gps.stop();
	        strokeDetector.stop();
	
	        // clean buffer
	        if (self.isDebugEnabled)
	            self.flushDebugBuffer();
	
	        session.finish().then(function () {
	            Dialog.hideModal();
	            back();
	        });
	    };
	
	    var confirmBeforeExit = function () {
	        if (tx) {
	            tx = false;
	            return true;
	        }
	
	        timer.pause();
	
	        paused = true;
	
	        self.confirm(function resume() {
	            paused = false;
	            timer.resume();
	            Dialog.hideModal();
	        }, function finish() {
	            clear();
	        });
	    };
	
	    $page.on('appBeforeBack', function (e) {
	        return confirmBeforeExit() === true;
	    });
	
	
	    var $pause, tapStarted = false, pauseCanceled = false, pauseTimeout, lastEvent, pauseAnimationStarted;
	    $page.on('tapstart', function (e) {
	        if (!e.originalEvent.touches) return;
	
	        lastEvent = e;
	        tapStarted = true;
	        pauseCanceled = false;
	        pauseAnimationStarted = false;
	        pauseTimeout = setTimeout(function (event) {
	            return function () {
	                if (pauseCanceled === true || event !== lastEvent) {
	                    pauseCanceled = false;
	                    tapStarted = false;
	                    pauseAnimationStarted = false;
	                    return;
	                }
	
	                var width = $page.width() * .4;
	
	                if (!$pause) $pause = $('#session-stop');
	
	                var svgPath = document.getElementById('pause-svg');
	                var path = new ProgressBar.Path(svgPath, {
	                    duration: 1000,
	                    easing: 'easeIn'
	                });
	
	                $pause.css({top: e.originalEvent.touches[0].clientY - (width / 2), left: e.originalEvent.touches[0].clientX - (width / 2)});
	                $pause.show();
	
	                $('body').css({overflow: 'hidden'});
	                pauseAnimationStarted = true;
	                path.animate(1, function () {
	                    Dialog.hideModal();
	                    if (pauseCanceled === true || event !== lastEvent) {
	                        return;
	                    }
	
	                    setTimeout(function () {
	                        $pause.hide();
	                        confirmBeforeExit();
	                    }, 20);
	                });
	
	                // try to prevent touch move on android, by placing a fixed backdrop on top of the animation
	                Dialog.showModal($('<div/>'), {color: ' rgba(0,0,0,0.1)'});
	            }
	        }(lastEvent), 450);
	    });
	
	    $page.on('tapend', function () {
	        if ($pause !== undefined)
	            $pause.hide();
	
	        if (tapStarted)
	            pauseCanceled = true;
	
	        clearTimeout(pauseTimeout);
	    });
	
	    $page.on('measureSwapStarted', function () {
	        // if already showing pause animation, let it do it
	        if (pauseAnimationStarted)
	            return;
	
	        // not showing pause, but tap started? Discard... user is changing measures
	        if (tapStarted)
	            pauseCanceled = true;
	
	        clearTimeout(pauseTimeout);
	    });
	}
	
	SessionView.prototype.debug = function (session) {
	    var self = this;
	    self.sensorData = [];
	
	    if (self.isDebugEnabled !== true)
	        return function () {};
	
	
	    // Open debug file
	    IO.open(session.getDebugFile()).then(function (file) {
	        self.sensorDataFile = file;
	    }).fail(function () {
	            self.sensorDataFileError = true;
	        });
	
	    self.sensorDataFileError = false;
	    return function onAccelerationTriggered(acceleration, value) {
	
	        if (self.sensorDataFileError == true) {
	            self.sensorData = [];
	            return;
	        }
	
	        if (self.sensorData.length >= 100) {
	            IO.write(self.sensorDataFile, self.sensorData.join('\n') + '\n');
	            self.sensorData = [];
	            return;
	        }
	
	        self.sensorData.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value].join(';'));
	    };
	};
	
	SessionView.prototype.flushDebugBuffer = function () {
	    var self = this;
	    if (self.isDebugEnabled !== true)
	        return;
	
	    IO.write(self.sensorDataFile, self.sensorData.join('\n'));
	};
	
	SessionView.prototype.createSession = function (calibration) {
	    var session = new Session(new Date().getTime() // TODO: handle timezone!!!
	        , calibration.getAngleZ()
	        , calibration.getNoiseX()
	        , calibration.getNoiseZ()
	        , calibration.getFactorX()
	        , calibration.getFactorZ()
	        , calibration.getPredominant()
	    );
	
	    return session.create();
	};
	
	SessionView.prototype.confirm = function (onresume, onfinish) {
	    var self = this;
	    var $controls = $('<div class="session-controls"/>');
	    var $resume = $('<div class="session-resume">' +
	        '<div class="session-controls-outer-text">' +
	        '<div class="session-controls-inner-text vw_font-size3">resume</div>' +
	        '</div></div></div>');
	    var $finish = $('<div class="session-finish"><div class="session-controls-outer-text">' +
	        '<div class="session-controls-inner-text vw_font-size3">finish</div>' +
	        '</div></div></div>');
	
	    $controls.append($finish).append($resume);
	    Dialog.showModal($controls, {});
	
	    // make height equal to width and adjust margin accordingly
	    var displayHeight = $controls.height();
	    setTimeout(function () {
	        var height = $resume.width();
	        var margin = (displayHeight - height) / 2;
	        $resume.height(height);
	        $finish.height(height);
	        $resume.css({"margin-top": margin, "margin-bottom": margin});
	        $finish.css({"margin-top": margin, "margin-bottom": margin});
	    }, 0);
	
	    // add behavior
	    $resume.on('touchend', function () {
	        onresume.apply(self, []);
	    });
	
	    $finish.on('touchend', function () {
	        onfinish.apply(self, []);
	    });
	}
	
	
	function saveLayout(top, middle, bottom, large) {
	    window.localStorage.setItem("layout", JSON.stringify({
	        top: top,
	        middle: middle,
	        bottom: bottom,
	        large: large
	    }));
	}
	
	function loadLayout() {
	    var layout = window.localStorage.getItem("layout");
	    if (layout)
	        return JSON.parse(layout);
	    else
	        return DEFAULT_POSITIONS;
	}
	
	function resetLayout() {
	    window.localStorage.removeItem("layout");
	}
	
	exports.SessionView = SessionView;


/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';
	
	exports.IO = {
	    open: function(filename) {
	        var self = this, defer = $.Deferred();
	
	        if (!filename) {
	            defer.reject();
	            return defer.promise();
	        }
	
	        console.log('open ', filename);
	
	        var success = function (dir) {
	            dir.getFile(filename, {create: true}, function (file) {
	                defer.resolve(file)
	            });
	        };
	
	        if (window.resolveLocalFileSystemURL)
	            window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, success, function fail(e) {
	                defer.reject(e);
	            });
	
	        return defer.promise();
	    },
	
	    write: function (file, content) {
	        if(!file) return;
	
	        file.createWriter(function (fileWriter) {
	
	            console.log('writting to', fileWriter);
	
	            fileWriter.seek(fileWriter.length);
	            var blob = new Blob([content], {type: 'text/plain'});
	            fileWriter.write(blob);
	            console.log('finished');
	
	        }, function fail() {
	            console.log("write to log failed");
	        });
	    },
	
	    read: function(file) {
	        var defer = $.Deferred();
	        file.file(function(file) {
	            var reader = new FileReader();
	
	            reader.onloadend = function(e) {
	                console.log("reading from: ", this);
	                defer.resolve(this.result);
	            }
	
	            reader.readAsText(file);
	        });
	
	        return defer.promise();
	    }
	};

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var utils = __webpack_require__(4);
	var Dialog = __webpack_require__(5);
	
	
	function GPS () {
	    var self = this;
	    self.listeners = [];
	    self.watchId = undefined;
	    self.currentPosition = undefined;
	    self.counter = 0;
	}
	
	GPS.prototype.listen = function(callback) {
	    var self = this;
	    self.listeners.push(callback);
	    if (!self.started)
	        self.start();
	};
	
	GPS.prototype.start = function() {
	    var self = this;
	
	    var onSuccess = function (position) {
	        
	        // first readings are always less accurate - discard them!
	        if (self.counter < 5) {
	            self.counter++;
	            return;
	        }
	        
	        if (position.coords.accuracy > 10) return;
	
	        // make sure that the reading has the necessary precision
	        if (!self.isAcceptablePosition(position, self.currentPosition))
	            return;
	
	        for (var i = 0, length = self.listeners.length; i < length; i++) {
	            self.listeners[i].apply(undefined, [position]);
	        }
	
	        self.currentPosition = position;
	    };
	
	    var onError = function (error) {
	        console.log(error);
	        var message, title;
	        if (device.platform === 'iOS') {
	            title = 'Location is disabled';
	            message = 'Please enable Location Services in <i>Settings > Privacy > Location Services</i> and in <i>Settings > Paddler</i>';
	        } else if (device.platform === 'Android') {
	            title = 'Unable to Acquire GPS Signal';
	            message = 'Please make sure GPS is enabled in <i>Settings > Location</i>';
	        }
	        setTimeout(function () {
	            Dialog.alert(title, message, 'OK', undefined);
	        }, 2000);
	    };
	
	
	    self.watchId = navigator.geolocation.watchPosition(onSuccess, onError, { timeout: 60000, enableHighAccuracy: true, maximumAge: 500 });
	
	    self.started = true;
	};
	
	GPS.prototype.stop = function() {
	    var self = this;
	    navigator.geolocation.clearWatch(self.watchId);
	};
	
	
	GPS.prototype.isAcceptablePosition = function (position, currentPosition) {
	    var self = this;
	    if (currentPosition === undefined) {
	        // A new location is always better than no location
	        return true;
	    }
	
	    // Check whether the new location fix is newer or older
	    var timeDelta = position.timestamp - currentPosition.timestamp;
	    var isSignificantlyNewer = timeDelta > 5000;
	    var isSignificantlyOlder = timeDelta < -5000;
	    var isNewer = timeDelta > 0;
	
	    // If it's been more than two minutes since the current location, use the new location
	    // because the user has likely moved
	    if (isSignificantlyNewer) {
	        return true;
	        // If the new location is more than two minutes older, it must be worse
	    } else if (isSignificantlyOlder) {
	        return false;
	    }
	
	    // Check whether the new location fix is more or less accurate
	    var accuracyDelta = position.coords.accuracy - currentPosition.accuracy;
	    var isMoreAccurate = accuracyDelta < 0;
	    var isSignificantlyLessAccurate = accuracyDelta > 10;
	
	    // Determine location quality using a combination of timeliness and accuracy
	    if (isMoreAccurate) {
	        return true;
	    } else if (isNewer && !isSignificantlyLessAccurate ) {
	        return true;
	    }
	    return false;
	};
	
	
	GPS.calcDistance = function (starting, ending) {
	    var KM_RATIO = 6371;
	    try {
	        var dLat = utils.toRadians(ending.coords.latitude - starting.coords.latitude);
	        var dLon = utils.toRadians(ending.coords.longitude - starting.coords.longitude);
	        var lat1Rad = utils.toRadians(starting.coords.latitude);
	        var lat2Rad = utils.toRadians(ending.coords.latitude);
	
	        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
	            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
	        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	        var d = KM_RATIO * c;
	
	        if (isNaN(d))
	            return 0;
	        else
	            return KM_RATIO * c;
	    } catch (e) {
	        return 0;
	    }
	};
	
	
	exports.GPS = GPS;

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';
	
	function lpad(value, places) {
	    var pad = new Array(places + 1).join('0');
	    var str = value + "";
	    return pad.substring(0, pad.length - str.length) + str;
	}
	function round(value, decimalPlaces) {
	    if (decimalPlaces === 0) return Math.round(value);
	
	    var precision = Math.pow(10, decimalPlaces);
	    return Math.round(value * precision) / precision;
	}
	
	function round2(value) {
	    return Math.round(value * 100) / 100;
	}
	
	function round1(value) {
	    return Math.round(value * 10) / 10;
	}
	
	function toRadians(degrees) {
	    return degrees * Math.PI / 180;
	}
	
	function isNetworkConnected() {
	
	    return navigator.connection.type === Connection.ETHERNET ||
	        navigator.connection.type === Connection.WIFI ||
	        navigator.connection.type === Connection.CELL_2G ||
	        navigator.connection.type === Connection.CELL_3G ||
	        navigator.connection.type === Connection.CELL_4G ||
	        navigator.connection.type === Connection.CELL;
	}
	
	function onWifi() {
	    return navigator.connection.type === Connection.ETHERNET || navigator.connection.type === Connection.WIFI;
	}
	
	function avg(arr) {
	    if (arr.length === 0) return 0;
	    var value = 0;
	    for (var i = 0; i < arr.length; i++) {
	        value += arr[i];
	    }
	    return value / arr.length;
	}
	
	function kmToMiles(kms) {
	    return kms * 0.621371;
	}
	
	function meterToFeet(meters) {
	    return meters * 3.28084;
	}
	
	/**
	 * Convert actions from browser actions into native ones (by registering plugins)
	 */
	function mapBrowserToNative() {
	
	    // Override default HTML alert with native dialog
	    if (navigator.notification) {
	        window.alert = function (message) {
	            navigator.notification.alert(
	                message,    // message
	                null,       // callback
	                "Paddler",  // title
	                'OK'        // buttonName
	            );
	        };
	
	        window.confirm = function (message, callback) {
	            return navigator.notification.confirm(message, callback, "Paddler", null)
	        }
	    }
	
	    document.addEventListener("backbutton", function (e) {
	        try {
	            App.back();
	        } catch (te) {
	            console.log(te);
	        }
	    }, false);
	
	    window.powermanagement.acquire();
	
	    StatusBar.overlaysWebView( false );
	    StatusBar.backgroundColorByHexString('#ffffff');
	    StatusBar.styleDefault();
	}
	
	exports.mapBrowserToNative = mapBrowserToNative;
	exports.lpad = lpad;
	exports.round2 = round2;
	exports.round1 = round1;
	exports.round = round;
	exports.toRadians = toRadians;
	exports.isNetworkConnected = isNetworkConnected;
	exports.onWifi = onWifi;
	exports.avg = avg;
	exports.kmToMiles = kmToMiles;
	exports.meterToFeet = meterToFeet;

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';
	
	var $modal = undefined;
	
	/**
	 *
	 *
	 * @param $content
	 * @param options
	 */
	function showModal($content, options) {
	    if ($modal) {
	        $modal.remove()
	    }
	    $modal = $('<div id="modal" class="dialog-overlay"></div>');
	
	    options = options || {};
	
	    // override background color
	    if (options.color) {
	        $modal.css({"background-color": options.color});
	    }
	    $modal.append($content);
	
	    // check if we want to center content in page
	    if (options.center === true) {
	        setTimeout(function () {
	            $content.center();
	        }, 0);
	    }
	    $modal.appendTo($('body'));
	}
	
	function hideModal() {
	    $modal.remove();
	    $modal = undefined;
	}
	
	
	function alert(title, body, btn, callback) {
	    var html = [
	        '<div class="info-modal-body">',
	        '<div class="info-modal-title vh_height10 vh_line-height10">',  title , '</div>',
	        '<div class="info-modal-content vh_height26">',
	        body,
	        '</div>',
	        '<div class="info-modal-controls vh_height15 vh_line-height15">',
	        '<div class="info-modal-primary-action">', btn, '</div>',
	        '</div>',
	        '</div>'
	    ];
	
	    var $body = $(html.join(''))
	        , $calibrate = $body.find('.info-modal-primary-action');
	
	
	
	    $calibrate.on('tap', function () {
	        hideModal();
	        if (callback) callback.apply({}, []);
	    });
	
	    showModal($body, {center: true});
	}
	
	exports.showModal = showModal;
	exports.hideModal = hideModal;
	exports.alert = alert;

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';
	
	function Calibration(predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorZ) {
	    var self = this;
	    self.predominant = predominant;
	    self.angleZ = angleZ;
	    self.noiseX = noiseX;
	    self.noiseY = noiseY;
	    self.noiseZ = noiseZ;
	    self.factorX = factorX;
	    self.factorZ = factorZ;
	}
	
	Calibration.prototype.getPredominant = function () {
	    return this.predominant;
	}
	
	Calibration.prototype.setPredominant = function (predominant) {
	    this.predominant = predominant;
	}
	
	Calibration.prototype.getAngleZ = function () {
	    return this.angleZ;
	}
	
	Calibration.prototype.setAngleZ = function (angleZ) {
	    this.angleZ = angleZ;
	}
	
	Calibration.prototype.getNoiseX = function () {
	    return this.noiseX;
	}
	
	Calibration.prototype.setNoiseX = function (noiseX) {
	    this.noiseX = noiseX;
	}
	
	Calibration.prototype.getNoiseY = function () {
	    return this.noiseY;
	}
	
	Calibration.prototype.setNoiseY = function (noiseY) {
	    this.noiseY = noiseY;
	}
	
	Calibration.prototype.getNoiseZ = function () {
	    return this.noiseZ;
	}
	
	Calibration.prototype.setNoiseZ = function (noiseZ) {
	    this.noiseZ = noiseZ;
	}
	
	Calibration.prototype.setActive = function (active) {
	    this.active = active;
	}
	
	Calibration.prototype.getFactorX = function () {
	    return this.factorX;
	}
	
	Calibration.prototype.setFactorX = function (factorX) {
	    this.factorX = factorX;
	}
	
	Calibration.prototype.getFactorZ = function () {
	    return this.factorZ;
	}
	
	Calibration.prototype.setFactorX = function (factorZ) {
	    this.factorZ = factorZ;
	}
	
	Calibration.prototype.save = function () {
	    window.localStorage.setItem("calibration", JSON.stringify({
	        predominant: this.predominant,
	        angleZ: this.angleZ,
	        noiseX: this.noiseX,
	        noiseY: this.noiseY,
	        noiseZ: this.noiseZ,
	        factorX: this.factorX,
	        factorZ: this.factorZ
	    }));
	};
	
	
	Calibration.load = function () {
	    var obj = JSON.parse(window.localStorage.getItem("calibration"));
	    if (!obj) {
	        return undefined;
	    }
	    return new Calibration(obj.predominant, obj.angleZ, obj.noiseX, obj.noiseY, obj.noiseZ, obj.factorX, obj.factorZ);
	}
	
	Calibration.blank = function () {
	    return new Calibration(0, 0, 0, 0, 0, 0, 0);
	}
	
	exports.Calibration = Calibration;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var db = __webpack_require__(8);
	var SessionDetail = __webpack_require__(9).SessionDetail;
	var utils = __webpack_require__(4);
	
	function Session(sessionStart, angleZ, noiseX, noiseZ, factorX, factorZ, axis, distance, avgSpm, topSpm, avgSpeed, topSpeed, sessionEnd) {
	    this.connection = db.getConnection();
	    this.id = null;
	    this.remoteId = null;
	    this.sessionStart = sessionStart;
	    this.sessionEnd = sessionEnd;
	    this.angleZ = angleZ;
	    this.noiseX = noiseX;
	    this.noiseZ = noiseZ;
	    this.factorX = factorX;
	    this.factorZ = factorZ;
	    this.axis = axis;
	    this.debugFile = this.sessionStart + ".csv";
	    this.distance = distance;
	    this.avgSpm = avgSpm;
	    this.topSpm = topSpm;
	    this.avgSpeed = avgSpeed;
	    this.topSpeed = topSpeed;
	    this.topEfficiency = undefined;
	    this.avgEfficiency = undefined;
	
	    this.dbgAttempt = undefined;
	    this.dbgSyncedRows = 0;
	    return this;
	}
	
	Session.prototype.setId = function (id) {
	    this.id = id;
	};
	Session.prototype.getId = function () {
	    return this.id;
	};
	
	Session.prototype.setRemoteId = function (id) {
	    this.remoteId = id;
	};
	Session.prototype.getRemoteId = function () {
	    return this.remoteId;
	};
	
	Session.prototype.setSessionStart = function (sessionStart) {
	    this.sessionStart = sessionStart;
	};
	Session.prototype.getSessionStart = function () {
	    return this.sessionStart;
	};
	
	Session.prototype.setSessionEnd = function (sessionEnd) {
	    this.sessionEnd = sessionEnd;
	};
	Session.prototype.getSessionEnd = function () {
	    return this.sessionEnd;
	};
	Session.prototype.setAngleZ = function (angleZ) {
	    this.angleZ = angleZ;
	};
	Session.prototype.getAngleZ = function () {
	    return this.angleZ;
	};
	Session.prototype.setNoiseX = function (noiseX) {
	    this.noiseX = noiseX;
	};
	Session.prototype.getNoiseX = function () {
	    return this.noiseX;
	};
	Session.prototype.setNoiseZ = function (noiseZ) {
	    this.noiseZ = noiseZ;
	};
	Session.prototype.getNoiseZ = function () {
	    return this.noiseZ;
	};
	Session.prototype.setFactorX = function (factorX) {
	    this.factorX = factorX;
	};
	Session.prototype.getFactorX = function () {
	    return this.factorX;
	};
	Session.prototype.setFactorZ = function (factorZ) {
	    this.factorZ = factorZ;
	};
	Session.prototype.getFactorZ = function () {
	    return this.factorZ;
	};
	Session.prototype.setAxis = function (axis) {
	    this.axis = axis;
	};
	Session.prototype.getAxis = function () {
	    return this.axis;
	};
	Session.prototype.setDebugFile = function (debug) {
	    this.debugFile = debug;
	};
	Session.prototype.getDebugFile = function () {
	    return this.debugFile;
	};
	
	Session.prototype.setAvgSpm = function (avgSpm) {
	    this.avgSpm = avgSpm;
	};
	Session.prototype.getAvgSpm = function () {
	    return this.avgSpm;
	};
	Session.prototype.setTopSpm = function (topSpm) {
	    this.topSpm = topSpm;
	};
	Session.prototype.getTopSpm = function () {
	    return this.topSpm;
	};
	Session.prototype.setAvgSpeed = function (avgSpeed) {
	    this.avgSpeed = avgSpeed;
	};
	Session.prototype.getAvgSpeed = function () {
	    return this.avgSpeed;
	};
	Session.prototype.setTopSpeed = function (topSpeed) {
	    this.topSpeed = topSpeed;
	};
	Session.prototype.getTopSpeed = function () {
	    return this.topSpeed;
	};
	
	Session.prototype.setTopEfficiency = function(value) {
	    this.topEfficiency = value;
	};
	
	// TODO: create efficiency fields in table
	Session.prototype.getTopEfficiency = function(){
	    return this.topEfficiency;
	};
	
	Session.prototype.setAvgEfficiency = function(value) {
	    this.avgEfficiency = value;
	};
	
	Session.prototype.getAvgEfficiency = function(){
	    return this.avgEfficiency;
	};
	
	Session.prototype.setDistance = function (distance) {
	    this.distance = distance;
	};
	Session.prototype.getDistance = function () {
	    return this.distance;
	};
	
	Session.prototype.setDebugAttempt = function (attempt) {
	    this.dbgAttempt = attempt;
	};
	Session.prototype.getDebugAttempt = function () {
	    return this.dbgAttempt;
	};
	Session.prototype.isSynced = function () {
	    return !!(this.remoteId);
	};
	
	Session.prototype.setDbgSyncedRows = function (rows) {
	    this.dbgSyncedRows = rows;
	};
	
	Session.prototype.getDbgSyncedRows = function () {
	    return this.dbgSyncedRows;
	};
	
	Session.prototype.createAPISession = function () {
	
	    var self = this,
	        defer = $.Deferred();
	
	    SessionDetail.get(self.getId(), function (rows) {
	
	        var dataPoints = [],
	            row;
	
	        for (var j = 0; j < rows.length; j++) {
	
	            row = rows[j];
	
	            dataPoints.push({
	                timestamp: row.getTimestamp(),
	                distance: utils.round2(row.getDistance()),
	                speed: utils.round2(row.getSpeed()),
	                spm: row.getSpm(),
	                spmEfficiency: utils.round2(row.getEfficiency()),
	                latitude: row.getLatitude(),
	                longitude: row.getLongitude()
	            });
	        }
	
	        defer.resolve({
	            date: new Date(self.getSessionStart()),
	            data: dataPoints,
	            angleZ: self.getAngleZ(),
	            noiseX: self.getNoiseX(),
	            noiseZ: self.getNoiseZ(),
	            factorX: self.getFactorX(),
	            factorZ: self.getFactorZ(),
	            axis: self.getAxis()
	        });
	    });
	
	    return defer.promise();
	};
	
	Session.prototype.create = function () {
	    var self = this;
	    self.connection.executeSql("INSERT INTO session (id, session_start, anglez, noisex, noisez, factorx, factorz, axis, dbg_file) VALUES (?,?,?,?,?,?,?,?,?)",
	        [this.id, this.sessionStart, this.angleZ, this.noiseX, this.noiseZ, this.factorX, this.factorZ, this.axis, this.debugFile], function (res) {
	            console.log("Session #" + res.insertId + " created");
	            self.id = res.insertId;
	        }, function (error) {
	            console.log(error.message);
	        });
	    return this;
	};
	
	Session.prototype.finish = function () {
	    var self = this, defer = $.Deferred();
	    self.connection.executeSql("select max(distance) total_distance, avg(speed) avg_speed, max(speed) max_speed, avg(spm) avg_spm, max(spm) top_spm, " +
	        " max(efficiency) max_ef, avg(efficiency) avg_ef FROM session_data where session = ?", [self.id], function (res) {
	
	        var record = res.rows.item(0);
	
	        self.setSessionEnd(new Date().getTime());
	        self.setDistance(record.total_distance);
	        self.setAvgSpeed(record.avg_speed);
	        self.setTopSpeed(record.max_speed);
	        self.setAvgSpm(record.avg_spm);
	        self.setTopSpm(record.top_spm);
	        self.setAvgEfficiency(record.avg_ef);
	        self.setTopEfficiency(record.max_ef);
	
	        self.connection.executeSql("update session set distance = ?, avg_spm = ?, top_spm = ?, avg_speed = ?, top_speed = ?, session_end = ? where id = ?"
	            , [record.total_distance, record.avg_spm, record.top_spm, record.avg_speed, record.max_speed, self.getSessionEnd(), self.id]
	            , function (a) {
	                defer.resolve(this);
	            }, function (a) {
	                console.log('error', a);
	                defer.reject(this);
	            })
	
	
	    }, function (error) {
	        console.log('Error creating session: ' + error.message);
	        defer.reject(this);
	    });
	    return defer;
	};
	
	Session.delete = function (id) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.transaction(function (tx) {
	        tx.executeSql("DELETE FROM session_data where session = ?", [id], function () {
	            tx.executeSql("DELETE FROM session where id = ?", [id], function s() {
	                defer.resolve();
	            }, function () {
	                defer.fail();
	            });
	
	        }, function error() {
	            defer.fail();
	        });
	    });
	    return defer.promise();
	};
	
	
	Session.synced = function (remoteId, id) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("update session set synced = 1, synced_at = ?, remote_id = ? where id = ?", [new Date().getTime(), remoteId, id], function success() {
	        defer.resolve();
	    }, function error() {
	        defer.fail();
	    });
	    return defer.promise();
	};
	
	Session.startDebugSync = function (id, total) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("update session set dbg_attempt = if(dbg_attempt is null, 1, dbg_attempt + 1), dbg_tot_rows = ? where id = ?", [total, id], function success() {
	        defer.resolve();
	    }, function error() {
	        defer.fail();
	    });
	    return defer.promise();
	};
	
	Session.debugSynced = function (id, rows) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("update session set dbg_sync_rows = dbg_sync_rows + ? where id = ?", [rows, id], function success() {
	        defer.resolve();
	    }, function error() {
	        defer.fail();
	    });
	    return defer.promise();
	};
	
	Session.debugSyncFinished = function (id, success) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("update session set dbg_synced = ?, dbg_synced_at = ? where id = ?", [success ? 1 : 0, new Date().getTime(), id], function success() {
	        defer.resolve();
	    }, function error() {
	        defer.fail();
	    });
	    return defer.promise();
	};
	
	Session.incrementAttempt = function (id) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("update session set dbg_attempt = dbg_attempt + 1 where id = ?", [id], function success() {
	        defer.resolve();
	    }, function error() {
	        defer.fail();
	    });
	    return defer.promise();
	};
	
	Session.sessionsSummary = function () {
	    var defer = $.Deferred();
	    var connection = db.getConnection();
	    connection.executeSql("SELECT sum(distance) distance, max(top_speed) speed, sum(session_end - session_start) duration FROM session", [], function (res) {
	        var record = res.rows.item(0);
	        defer.resolve({
	            distance: record.distance,
	            speed: record.speed,
	            duration: record.duration
	        });
	    }, function (error) {
	        defer.fail(error);
	    });
	    return defer.promise();
	};
	
	
	Session.findAllNotSynced = function (callback) {
	    var connection = db.getConnection();
	    connection.executeSql("SELECT * FROM session WHERE synced <> 1 OR ((datetime('now','localtime') - session_start) < (604800 * 8) AND dbg_synced = 0)", [], function (res) {
	        var rows = [];
	        for (var i = 0; i < res.rows.length; i++) {
	            rows.push(sessionFromDbRow(res.rows.item(i)));
	        }
	        callback(rows);
	    }, function (error) {
	        console.log('Error retrieving sessions: ' + error.message);
	    });
	};
	
	Session.all = function (callback) {
	    var self = this;
	    var connection = db.getConnection();
	    connection.executeSql("SELECT * FROM session order by id desc", [], function (res) {
	        var rows = [];
	        for (var i = 0; i < res.rows.length; i++) {
	            rows.push(sessionFromDbRow(res.rows.item(i)));
	        }
	        callback(rows);
	    }, function (error) {
	        console.log('Error retrieving sessions: ' + error.message);
	    });
	};
	
	Session.last = function () {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("SELECT * FROM session order by id desc limit 1", [], function (res) {
	
	        if (res.rows.length > 0) {
	            defer.resolve(sessionFromDbRow(res.rows.item(0)));
	            return;
	        }
	        defer.resolve(undefined);
	    }, function (error) {
	        defer.reject(error.message);
	    });
	
	    return defer.promise();
	};
	
	Session.get = function (id) {
	    var connection = db.getConnection();
	    var defer = $.Deferred();
	    connection.executeSql("SELECT * FROM session where id = ?", [id], function (res) {
	
	        if (res.rows.length > 0) {
	            defer.resolve(sessionFromDbRow(res.rows.item(0)));
	            return;
	        }
	        defer.resolve(undefined);
	    }, function (error) {
	        defer.reject(error.message);
	    });
	
	    return defer.promise();
	};
	
	
	function sessionFromDbRow(data) {
	    var session = new Session(
	        data.session_start,
	        data.anglez,
	        data.noisex,
	        data.noisez,
	        data.factorx,
	        data.factorz,
	        data.axis,
	        data.distance,
	        data.avg_spm,
	        data.top_spm,
	        data.avg_speed,
	        data.top_speed,
	        data.session_end
	    );
	
	    session.setId(data.id);
	    session.setDebugAttempt(data.dbg_attempt);
	    session.setRemoteId(data.remote_id);
	    session.setDbgSyncedRows(data.dbg_sync_rows);
	
	    return session;
	}
	
	
	exports.Session = Session;


/***/ },
/* 8 */
/***/ function(module, exports) {

	'use strict';
	
	var connection;
	
	// Array with DDL to be applied to each version of database; Each position corresponds to a version number
	var ddl = [
	    [
	        ["CREATE TABLE IF NOT EXISTS settings (",
	            "version INTEGER NOT NULL,",
	            "units TEXT not null default 'K',",
	            "sync_wifi integer not null default 1,",
	            "restore_layout integer not null default 1",
	            ")"],
	
	        ["CREATE TABLE IF NOT EXISTS session (",
	            "id INTEGER NOT NULL PRIMARY KEY,",
	            "remote_id TEXT,",
	            "session_start INTEGER NOT NULL,",
	            "session_end INTEGER,",
	            "anglez REAL NOT NULL,",
	            "noisex REAL NOT NULL,",
	            "noisez REAL NOT NULL,",
	            "factorx REAL NOT NULL,",
	            "factorz REAL NOT NULL,",
	            "axis INTEGER NOT NULL,",
	            "distance REAL,",
	            "avg_spm REAL,",
	            "avg_speed REAL,",
	            "top_spm REAL,",
	            "top_speed REAL,",
	            "synced INTEGER DEFAULT 0,",
	            "synced_at INTEGER,",
	            "dbg_file TEXT,",
	            "dbg_attempt integer,",
	            "dbg_tot_rows integer,",
	            "dbg_sync_rows INTEGER DEFAULT 0,",
	            "dbg_synced INTEGER DEFAULT 0,",
	            "dbg_synced_at INTEGER",
	            ")"],
	
	        ["CREATE TABLE IF NOT EXISTS session_data (",
	            "id INTEGER NOT NULL PRIMARY KEY,",
	            "session INTEGER NOT NULL,",
	            "timestamp INTEGER NOT NULL,",
	            "distance REAL,",
	            "speed REAL,",
	            "spm INTEGER,",
	            "efficiency REAL",
	            ")"],
	        ["insert into settings (version) values (1)"]
	    ],
	    [
	        ["ALTER TABLE session_data add column latitude REAL"],
	        ["ALTER TABLE session_data add column longitude REAL"],
	        ["ALTER TABLE settings add column show_touch_events_tips integer not null default 1"],
	        ["ALTER TABLE settings add column show_calibration_tips integer not null default 1"],
	        ["UPDATE settings SET version = 2"]
	    ]
	];
	
	
	var success = function () {
	    console.log('table created successfully')
	};
	var error = function (e) {
	    console.log('error creating table', e);
	};
	
	
	/**
	 * This method should apply all changes in ddl (currently only applies for version 0)
	 */
	function init() {
	    connection = window.sqlitePlugin.openDatabase({name: "sessions.db", "location": 2});
	
	    determineDbVersion().then(function (version) {
	        connection.transaction(function (tx) {
	            var sql;
	            for (var d = version; d < ddl.length; d++) {
	
	                for (var i = 0; i < ddl[d].length; i++) {
	                    sql = ddl[d][i].join('');
	                    tx.executeSql(sql, [], success, error);
	                }
	            }
	        });
	    });
	}
	
	
	function determineDbVersion() {
	    var defer = $.Deferred();
	    connection.executeSql("select version from settings", [], function success(res) {
	        defer.resolve(res.rows.item(0).version);
	    }, function error(err) {
	        defer.resolve(0);
	    });
	    return defer.promise();
	}
	
	
	exports.init = init;
	exports.getConnection = function () {
	    return connection;
	}

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var db = __webpack_require__(8);
	
	function SessionDetail(session, timestamp, distance, speed, spm, efficiency, latitude, longitude) {
	    this.connection = db.getConnection();
	    this.session = session;
	    this.timestamp = timestamp;
	    this.distance = distance || 0;
	    this.speed = speed || 0;
	    this.spm = spm;
	    this.efficiency = efficiency || 0;
	    this.latitude = latitude;
	    this.longitude = longitude;
	}
	
	SessionDetail.prototype.getSession = function () {
	    return this.session;
	}
	
	SessionDetail.prototype.setSession = function (session) {
	    this.session = session;
	}
	
	SessionDetail.prototype.getTimestamp = function () {
	    return this.timestamp;
	}
	
	SessionDetail.prototype.setTimestamp = function (timestamp) {
	    this.timestamp = timestamp;
	}
	
	SessionDetail.prototype.getDistance = function () {
	    return this.distance;
	}
	
	SessionDetail.prototype.setDistance = function (distance) {
	    this.distance = distance;
	}
	
	SessionDetail.prototype.getSpeed = function () {
	    return this.speed;
	}
	
	SessionDetail.prototype.setSpeed = function (speed) {
	    this.speed = speed;
	}
	
	SessionDetail.prototype.getSpm = function () {
	    return this.spm;
	}
	
	SessionDetail.prototype.setSpm = function (spm) {
	    this.spm = spm;
	}
	
	SessionDetail.prototype.getEfficiency = function () {
	    return this.efficiency;
	}
	
	SessionDetail.prototype.setEfficiency = function (efficiency) {
	    this.efficiency = efficiency;
	}
	
	SessionDetail.prototype.getLatitude = function () {
	    return this.latitude;
	}
	
	SessionDetail.prototype.setLatitude = function (latitude) {
	    this.latitude = latitude;
	}
	
	SessionDetail.prototype.getLongitude = function () {
	    return this.longitude;
	}
	
	SessionDetail.prototype.setLongitude = function (longitude) {
	    this.longitude = longitude;
	}
	
	SessionDetail.prototype.save = function () {
	    this.connection.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency, latitude, longitude) VALUES (?,?,?,?,?,?,?,?)",
	        [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency, this.latitude, this.longitude], function (res) {
	            console.log("Session Data#" + res.insertId + " created");
	        }, function (error) {
	            console.log('Error creating session: ' + error.message);
	        });
	};
	
	SessionDetail.get = function(sessionId, callback) {
	    var connection = db.getConnection();
	    connection.executeSql("SELECT timestamp, distance, speed, spm, efficiency, latitude, longitude FROM session_data WHERE session = ?",[sessionId], function (res) {
	        var rows = [], data;
	        for (var i = 0; i < res.rows.length; i++) {
	            data = res.rows.item(i);
	            rows.push(new SessionDetail(sessionId, data.timestamp, data.distance, data.speed, data.spm, data.efficiency, data.latitude, data.longitude));
	        }
	        callback(rows);
	    }, function (error) {
	        console.log('Error retrieving sessions: ' + error.message);
	    });
	};
	
	exports.SessionDetail = SessionDetail;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(4);
	var lastEvent = undefined, retries = 0;
	
	//var asteroid = new Asteroid("local.gopaddler.com:3000", false);
	var asteroid = new Asteroid("app.gopaddler.com", true, function intercept (data) {
	    lastEvent = data;
	});
	
	var serverAvailable = function (d) {
	    var defer = d || $.Deferred();
	
	    if (retries >= 3) defer.reject();
	
	    // If no network, server is for sure not available
	    if (!Utils.isNetworkConnected()) {
	        return defer.reject();
	    }
	
	    if (lastEvent !== undefined) {
	        retries++;
	        setTimeout(function () {
	            serverAvailable(defer);
	        }, 1000);
	    } else {
	
	        if (lastEvent && (lastEvent.type === "socket_close"
	            || lastEvent.type === "socket_error")) {
	            defer.reject();
	        } else {
	            defer.resolve();
	        }
	    }
	    return defer.promise();
	};
	
	/**
	 * Load user information from local storage.
	 *
	 * @returns {*}
	 *
	 * @private
	 */
	function _localLogin() {
	
	    var defer = $.Deferred(),
	        serializedUser = localStorage.getItem('user'),
	        user;
	
	    serverAvailable().done(function serverIsAvailable() {
	        defer.reject();
	
	    }).fail(function serverNotAvailable() {
	
	            if (serializedUser) {
	
	                user = JSON.parse(serializedUser);
	
	                asteroid.loggedIn = true;
	                asteroid.userId = user._id;
	                asteroid.user = user;
	
	                _finishLogin(defer, user);
	
	            } else {
	
	                defer.reject();
	            }
	    });
	
	    return defer.promise();
	}
	
	
	/**
	 * Authenticate the user remotely.
	 *
	 * @returns {*}
	 *
	 * @private
	 */
	function _remoteLogin() {
	
	    var defer = $.Deferred();
	
	    if (Utils.isNetworkConnected()) {
	
	        asteroid.loginWithFacebook().then(function (user) {
	
	            _finishLogin(defer, user);
	
	        }).catch(function (err) {
	
	            defer.reject(err);
	        });
	
	    } else {
	
	        defer.reject('No network');
	    }
	
	    return defer.promise();
	}
	
	
	/**
	 *
	 * @param defer
	 * @param user
	 *
	 * @private
	 */
	function _finishLogin(defer, user) {
	    _storeUser(user);
	    defer.resolve(user);
	}
	
	
	/**
	 * Register the user for this session and persist it in the local storage.
	 *
	 * @param user
	 *
	 * @private
	 */
	function _storeUser(user) {
	    asteroid.user = user;
	    localStorage.setItem('user', JSON.stringify(user));
	}
	
	
	/**
	 *
	 * @private
	 */
	function _call() {
	
	    var defer = $.Deferred();
	
	    asteroid.call.apply(asteroid, arguments).result.then(function (response) {
	
	        defer.resolve(response);
	
	    }).catch(function (err) {
	
	        defer.reject(err);
	    });
	
	    return defer.promise();
	}
	
	
	/**
	 * Authentication methods.
	 */
	exports.Auth = {
	
	    login: function () {
	
	        var defer = $.Deferred();
	
	        _localLogin().done(function (user) {
	
	            defer.resolve(user);
	
	            // even if the local authentication succeeds go ahead and try to login remotely
	            _remoteLogin();
	
	        }).fail(function () {
	
	            // local login failed, let's try the remote login
	            _remoteLogin().done(defer.resolve).fail(defer.reject);
	        });
	
	        return defer.promise();
	    },
	
	
	    logout: function () {
	
	        var defer = $.Deferred();
	
	        asteroid.logout().then(function () {
	
	            // remove from local storage
	            localStorage.removeItem('user');
	
	            // set values to undefined
	            asteroid.user = undefined;
	
	            defer.resolve();
	
	        }).catch(function (err) {
	
	            defer.reject(err);
	        });
	
	
	        return defer.promise();
	    }
	};
	
	
	/**
	 * Users methods.
	 */
	exports.User = {
	
	
	    set: function (user) {
	        asteroid.user = user;
	        asteroid.userId = user._id;
	    },
	
	
	    get: function () {
	        return asteroid.user;
	    },
	
	
	    getId: function () {
	        return asteroid.userId;
	    },
	
	
	    getProfile: function () {
	        return asteroid.user.profile;
	    },
	
	
	    saveDevice: function (device) {
	        return _call('saveUserDevice', device);
	    }
	};
	
	
	/**
	 * Training Session methods.
	 */
	exports.TrainingSessions = {
	
	    save: function (trainingSession) {
	
	        return _call('saveTrainingSession', trainingSession);
	    }
	};
	
	
	/**
	 * Debug Session methods.
	 */
	exports.DebugSessions = {
	
	    save: function (debugSession) {
	
	        return _call('saveTrainingSessionDebug', debugSession);
	    }
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'
	
	var utils = __webpack_require__(4);
	
	var SPM_STROKE_COUNT = 8;
	
	function StrokeDetector(session, calibration, onStrokeDetected, onAccelerationTriggered) {
	    var self = this;
	    self.watchId = undefined;
	
	    self.max = 0;
	    self.min = 0;
	    self.maxAt = undefined;
	    self.minAt = undefined;
	    self.maxs = [];
	    self.mins = [];
	    self.checkpoint = undefined;
	    self.positiveMaxs = [];
	    self.negativeMaxs = [];
	    self.positiveThreshold = undefined;
	    self.negativeThreshold = undefined;
	    self.strokes = [];
	    self.events = [];
	    self.intervals = [];
	    self.lastStroke = new Event(0, 0, 0, 0, /* detected = */ new Event(0, 0, 0, 0, undefined));
	    self.counter = 0;
	    self.lastEvent = undefined;
	
	    self.intervalId = undefined;
	    self.session = session;
	    self.debugAcceleration = [];
	    self.calibration = calibration;
	
	    self.debug = false;
	
	    // used in simulation, to represent strokes in chart
	    self.onStrokeDetectedListener = onStrokeDetected || function () {};
	    self.onAccelerationTriggeredListener = onAccelerationTriggered || function () {};
	    self.onStrokeRateChangedListener = function () {};
	    self.onThresholdChangedListener = function() {};
	}
	
	StrokeDetector.exceptions = {
	    SD_EXCP_STALLED:  "STALLED"
	}
	
	StrokeDetector.prototype.onStrokeRateChanged = function (callback) {
	    var self = this;
	    self.onStrokeRateChangedListener = callback;
	}
	
	StrokeDetector.prototype.onAccelerationTriggered = function (callback) {
	    var self = this;
	    self.onAccelerationTriggeredListener = callback;
	}
	
	StrokeDetector.prototype.onThresholdChanged = function (callback) {
	    var self = this;
	    self.onThresholdChangedListener = callback;
	}
	
	StrokeDetector.prototype.onStrokeDetected = function (callback) {
	    var self = this;
	    self.onStrokeDetectedListener = callback;
	}
	
	StrokeDetector.prototype.stop = function () {
	    var self = this;
	    if (navigator.accelerometer)
	        navigator.accelerometer.clearWatch(self.watchId);
	    clearInterval(self.intervalId);
	}
	
	StrokeDetector.prototype.start = function () {
	    var self = this, value;
	    function onSuccess(acceleration) {
	
	        // filter
	        value = self.filter(acceleration);
	
	        // call event handler
	        self.process(acceleration, value);
	
	        // for debug
	        self.onAccelerationTriggeredListener(acceleration, value);
	    }
	
	    function onError() {
	        console.log('onError!');
	    }
	
	
	    if (!self.calibration) {
	        console.log("alert: missing calibration");
	        return;
	    }
	
	    var options = { frequency: 40 };
	    try {
	        self.watchId = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
	    } catch (e) {
	        console.log('hmmm... no navigator.accelerometer found?!?!');
	    }
	
	    self.intervalId = setInterval(self.refreshSPM.bind(self), 1500);
	};
	
	StrokeDetector.prototype.refreshSPM = function () {
	    var self = this, range, result;
	    range = self.strokes.slice(-SPM_STROKE_COUNT);
	    result = self.calculateSPM(range) || {};
	
	    if (!isNaN(result.spm))
	        self.onStrokeRateChangedListener(result.spm, result.interval);
	
	    // keep only last 8 strokes, without any clean up of stroke rate calculation
	    self.strokes = self.strokes.slice(-SPM_STROKE_COUNT);
	
	    if (result.spm === 0) {
	        self.onStrokeRateChangedListener(0, undefined);
	        self.strokes = [];
	    }
	    return result.spm;
	};
	
	
	/**
	 * Process events coming from accelerometer
	 *
	 * @param acceleration
	 * @param value
	 */
	StrokeDetector.prototype.process = function (acceleration, value) {
	    var self = this, current, stroke;
	
	    if (self.checkpoint === undefined)
	        self.checkpoint = acceleration.timestamp;
	
	    value = utils.round2(value);
	
	    self.updateThresholds(acceleration, value);
	
	    if (self.positiveThreshold === undefined) return;
	
	    current = new Event(acceleration.timestamp, value, self.positiveThreshold, self.negativeThreshold, undefined);
	
	    if (self.isAccelerationCrossingThreshold(current, self.lastEvent)
	        && (stroke = self.findMaxAbovePositiveThreshold(self.events, acceleration, self.lastStroke)) !== undefined) {
	        stroke.setDetected(current);
	
	        var lost = self.didWeLostOne(self.events, stroke, self.lastStroke);
	
	        if (!lost) {
	
	            // add current
	            self.counter++;
	            stroke.setStroke(self.counter);
	            self.strokes.push(stroke);
	            self.onStrokeDetectedListener(stroke);
	
	            self.lastStroke = stroke;
	        }
	        // lost is before current
	        else if (lost.position === -1) {
	
	            // add lost
	            self.counter++;
	            lost.stroke.setStroke(self.counter);
	            self.strokes.push(lost.stroke);
	            self.onStrokeDetectedListener(lost.stroke);
	            self.lastStroke.getDetected().relocate(lost.stroke);
	
	            // add current
	            self.counter++;
	            stroke.setStroke(self.counter);
	            self.strokes.push(stroke);
	            self.onStrokeDetectedListener(stroke);
	
	            self.lastStroke = stroke;
	
	        }
	        // lost is after current
	        else {
	
	            // add current
	            self.counter++;
	            stroke.setStroke(self.counter);
	            self.strokes.push(stroke);
	            self.onStrokeDetectedListener(stroke);
	            self.lastStroke.getDetected().relocate(stroke);
	
	            // add lost
	            self.counter++;
	            lost.stroke.setStroke(self.counter);
	            self.strokes.push(lost.stroke);
	            self.onStrokeDetectedListener(lost.stroke);
	
	            self.lastStroke = lost.stroke;
	        }
	
	        self.events = [];
	
	    } else {
	        self.events = self.consolidate(self.events, current);
	    }
	
	    if (current.isSmallerThanOrEquealToNegativeThreshold() && self.lastStroke) {
	        self.lastStroke.getDetected().add(current);
	    }
	
	    self.lastEvent = current;
	};
	
	/**
	 * Calculate positive and negative threshold
	 * @param acceleration
	 * @param value
	 */
	StrokeDetector.prototype.updateThresholds = function (acceleration, value) {
	    var self = this;
	
	    if (value > self.max) {
	        self.max = value;
	        self.maxAt = acceleration.timestamp;
	    }
	    if (value < self.min) {
	        self.min = value;
	        self.minAt = acceleration.timestamp;
	    }
	
	    // recalculate every 1 second
	    if ((acceleration.timestamp - self.checkpoint) <= 1000)
	        return;
	
	    self.checkpoint = acceleration.timestamp;
	
	    if (self.positiveMaxs.length === 3) self.positiveMaxs.shift();
	    if (self.negativeMaxs.length === 3) self.negativeMaxs.shift();
	
	    self.positiveMaxs.push(self.max);
	    self.negativeMaxs.push(self.min);
	
	    self.max = 0;
	    self.min = 0;
	
	    if (self.positiveMaxs.length === 3) {
	        self.positiveThreshold =  utils.round2(self.positiveMaxs.avg() * .5);
	        self.negativeThreshold = utils.round2(self.negativeMaxs.avg() * .5);
	        self.onThresholdChangedListener.apply({}, [acceleration.timestamp
	            , self.positiveThreshold, self.negativeThreshold]);
	    }
	};
	
	/**
	 * Filter acceleration based on calibration
	 *
	 * @param acceleration
	 * @returns {number}
	 */
	StrokeDetector.prototype.filter = function(acceleration) {
	    var self = this;
	    var factor, adjustment, value;
	    if (self.calibration.getPredominant() == 0) {
	        factor = self.calibration.getFactorX();
	        adjustment = self.calibration.getNoiseX();
	        value = acceleration.x;
	    } else {
	        factor = self.calibration.getFactorZ();
	        adjustment = self.calibration.getNoiseZ();
	        value = acceleration.z;
	    }
	
	    return (value - adjustment) * factor;
	}
	
	/**
	 * Checks if last stroke was tracked before negative threshold and current one is after!
	 * @param current
	 * @param previous
	 * @returns {boolean|*|*}
	 */
	StrokeDetector.prototype.isAccelerationCrossingThreshold = function(current, previous) {
	    return previous != null && current != null && previous.isBiggerThanNegativeThreshold() && current.isSmallerThanOrEquealToNegativeThreshold();
	}
	
	StrokeDetector.prototype.findMaxAbovePositiveThreshold = function (events, acceleration, lastStroke) {
	
	    var max = undefined;
	    for (var i = 0; i < events.length; i++) {
	        if (events[i].isBiggerThanPositiveThreshold()) {
	            if (!events[i].isDiscarded() && (!max || events[i].getAcceleration() > max.getAcceleration())) {
	                max = events[i];
	            }
	        }
	    }
	
	    if (!max)
	        return undefined;
	
	    if (max.getSampleAt() - lastStroke.getSampleAt() <= 300 || acceleration.timestamp - lastStroke.getDetected().getSampleAt() <= 300) {
	        // This max won't ever validate... we need to give the chance to the next max to validate a new stroke!!
	        max.setDiscarded(true);
	        return undefined;
	    }
	
	    return max;
	}
	
	/**
	 * Check if we failed to detect strokes between the last one and current potential stroke
	 *
	 * @param {Array} events
	 * @param {Event} current   current stroke
	 * @param {Event} last      previous detected stroke
	 * @returns {*}
	 */
	StrokeDetector.prototype.didWeLostOne = function (events, current, last) {
	    var self = this;
	    var indexOfCurrent = indexOf(events, current);
	
	    // Search for stroke before max
	    var pre = before(after(events.slice(0, indexOfCurrent), 300), 300);
	    var post = before(after(events.slice(indexOfCurrent + 1, events.length - 1), 300), 300);
	    var data = pre.concat(post);
	
	    if (data.length <= 4)
	        return undefined;
	
	    return self.findFuzzyStroke(data, current, last);
	};
	
	
	/**
	 * Try to detect strokes that don't cross thresholds, but may feet other criteria
	 *
	 * @param events
	 * @param current   current stroke
	 * @param last      last detected stroke
	 * @returns {*}
	 */
	StrokeDetector.prototype.findFuzzyStroke = function (events, current, last) {
	    var self = this, cadence, mg;
	
	    var extremity = minAndMax(events);
	    var max = extremity.max, min = extremity.min;
	    max.setDetected(min);
	    max.setFuzzy(true);
	
	    // if max is before current detected stroke, then we may find a lost stroke before current one
	    if (max.getSampleAt() < current.getSampleAt()) {
	        cadence = self.strokes.cadence();
	        mg = magnitude(self.strokes);
	
	        if (self.isValidStroke(max, last, current, cadence, mg)) {
	            return {
	                stroke: max,
	                position: -1
	            };
	        }
	        return undefined;
	    }
	
	    // lost is after current
	    if (max.getSampleAt() > current.getSampleAt()) {
	
	        cadence = self.strokes.cadence();
	        mg = magnitude(self.strokes);
	
	
	        max.getDetected(current.getDetected());
	        var before = new Event(current.getSampleAt(), current.getAcceleration(), current.positiveThreshold, current.negativeThreshold, min);
	
	        // check if lost makes a valid stroke if placed after current
	        if (self.isValidStroke(max, before, undefined, cadence, mg)
	            // check if current makes a valid stroke with last detected stroke
	            && self.isValidStroke(current, last, max, cadence, mg)) {
	
	            current.setDetected(min);
	            return {
	                stroke: max,
	                position: 1
	            }
	        }
	
	        return undefined;
	    }
	
	    return undefined;
	}
	
	
	StrokeDetector.prototype.isValidStroke = function(stroke, before, after, cadence, magnitude) {
	    var self = this;
	    var log = function (reason) {
	        if (self.debug === false) return;
	        console.log(self.counter, reason);
	    }
	
	    if (!cadence) {
	        log('no cadence');
	        return false;
	    }
	
	    // its within acceptable difference to current cadence
	    if (Math.abs((cadence - (stroke.getSampleAt() - before.getSampleAt())) / cadence)>0.4) {
	        log('it\'s not within accepetable difference to current cadence; actual: ' + (stroke.getSampleAt() - before.getSampleAt())
	            + '; Cadence: ' + cadence + "; variation: "
	            + Math.abs((cadence - (stroke.getSampleAt() - before.getSampleAt())) / cadence));
	        return false;
	    }
	
	    // does not create a stroke whose interval is less than 300 milis
	    if (stroke.getSampleAt() - before.getSampleAt() < 300 ||  (after && Math.abs(stroke.getSampleAt() - after.getSampleAt()) < 300)) {
	        log('stroke interval would be < 300');
	        return false;
	    }
	
	    // interval between detected must also be > 300
	    if (stroke.getDetected().getSampleAt() - before.getDetected().getSampleAt() < 300) {
	        log('interval between detected would be < 300');
	        return false;
	    }
	
	    if ((stroke.getAcceleration() - stroke.getDetected().getAcceleration()) / magnitude < .8) {
	        log('Variation in acceleration is to low to consider a stroke');
	        return false;
	    }
	
	
	    return true;
	}
	
	/**
	 * Ensures that we don't keep events that are older than 3 seconds
	 * @param {Array} events
	 * @param value
	 * @returns {*}
	 */
	StrokeDetector.prototype.consolidate = function (events, value) {
	    var self = this;
	    events.push(value);
	    if (value.getSampleAt() - events[0].getSampleAt() <= 3000) {
	        return events;
	    }
	    for (var i = (events.length - 1); i >= 0; i--) {
	        if (value.getSampleAt() - events[i].getSampleAt() > 3000)
	            break;
	    }
	    if (i > 0)
	        events = events.slice(events.length - i);
	    return events;
	};
	
	
	StrokeDetector.prototype.calculateSPM = function (strokes) {
	    var self = this;
	
	    // if we don't have strokes in the past 3 seconds, set it to zero
	    if (self.lastStroke && self.lastEvent && (self.lastEvent.getSampleAt() - self.lastStroke.getDetected().getPosition() > 3000)) {
	        return {spm: 0, interval: 0};
	    }
	
	    if (strokes.length < SPM_STROKE_COUNT)
	        return undefined;
	
	    // --- look for strokes that don't feet well in current stroke rate and discard them (replace by average)
	    var c = self.calculateIntervals(strokes);
	    var intervals = c.intervals;
	    var map = c.map;
	    var avg = intervals.avg();
	    var updated = false;
	    var variance;
	    var adjusted = 0;
	
	    for (var i = intervals.length - 1; i >= 0; i--) {
	        variance = (avg - intervals[i]) / avg;
	
	        if (variance > 0 && variance >= .4) {
	
	            // after 2 strokes, if post strokes are inline with avg, it's probably because we counted one stroke
	            // more than we should
	            if (intervals.length - i > 1 && adjusted == 0) {
	
	                var which = self.pickBestMatch(avg, map[i][1], map[i][0]);
	                var remove;
	
	                // if best match is 1st, remove second
	                if (which === 1) {
	                    remove = map[i][0];
	                } else {
	                    remove = map[i][1];
	                }
	
	//                console.log('removing stroke', remove.getStroke());
	                map[i][0].setDiscarded(true);
	                strokes.splice(indexOf(strokes, remove), 1);
	
	                adjusted = 0;
	            } else {
	//                console.log('strokes ', map[i][1].getStroke(), map[i][0].getStroke(), 'are probably a single stroke', variance);
	            }
	
	            updated = true;
	            adjusted++;
	            intervals.splice(i, 1);
	
	        } else if (variance < 0 && variance <= -.4) {
	            updated = true;
	//            console.log('lost strokes between ', map[i][1].getStroke(), map[i][0].getStroke());
	            intervals.splice(i, 1);
	        }
	    }
	
	    if (intervals.length === 0) {
	        // happened when stopped rowing and all the intervals were far from the variance!
	        return 0;
	    }
	
	    if (updated)
	        avg = intervals.avg();
	
	    // Calculate stroke rate
	    // avg interval between strokes in mili seconds (thus the division by 1000)
	    var strokeRate = 60 / (avg / 1000);
	
	//    console.log("spm: ", Math.round(strokeRate), map[0][0].getStroke()
	//        , map[1][0].getStroke(), map[2][0].getStroke(), map[3][0].getStroke());
	    return {spm: Math.round(strokeRate), interval: avg};
	};
	
	
	/**
	 * When we find an extra stroke that does not feet current cadence, we have to eliminate that stroke; this method will
	 * decide which stroke (from the 2 that form an interval that is to small) is to be removed
	 * @param avg
	 * @param first
	 * @param second
	 * @returns {number}
	 */
	StrokeDetector.prototype.pickBestMatch = function (avg, first, second) {
	    var self = this;
	    var positionFirst = indexOf(self.strokes, first);
	    var positionSecond = indexOf(self.strokes, second);
	    var beforeFirst = self.strokes[positionFirst - 1];
	    var afterSecond = self.strokes[positionSecond + 1 ];
	
	    var varianceFirstBefore = Math.abs((avg - (first.getDetected().getPosition() - beforeFirst.getDetected().getPosition())) / avg);
	    var varianceFirstAfter = Math.abs((avg - (afterSecond.getDetected().getPosition() - first.getDetected().getPosition())) / avg);
	
	    if (varianceFirstBefore < .4 && varianceFirstAfter < .4)
	        return 1;
	
	    var varianceSecondBefore = Math.abs((avg - (second.getDetected().getPosition() - beforeFirst.getDetected().getPosition())) / avg);
	    var varianceSecondAfter = Math.abs((avg - (afterSecond.getDetected().getPosition() - second.getDetected().getPosition())) / avg);
	
	    if (varianceSecondBefore < .4 && varianceSecondAfter < .4)
	        return 2;
	
	    if ((varianceFirstBefore + varianceFirstAfter) < (varianceSecondBefore + varianceSecondAfter)) {
	        return 1;
	    } else {
	        return 2;
	    }
	};
	
	/**
	 * Calculate interval between strokes
	 */
	StrokeDetector.prototype.calculateIntervals = function (strokes) {
	    var self = this, intervals = [], map = [];
	    for (var i = 1, length = strokes.length; i < length; i++) {
	        map.push([strokes[i], strokes[i - 1]]);
	        // use minimums to calculate intervals (instead of max's) because they are tipically more stable!
	        // use position, given that position assigns a middle position between all accelerations bellow negative threshold
	        intervals.push(strokes[i].getDetected().getPosition() - strokes[i - 1].getDetected().getPosition());
	    }
	    return {
	        intervals: intervals,
	        map: map
	    };
	}
	
	
	
	// Event
	function Event(timestamp, acceleration, pt, nt, detected) {
	    this._timestamp = timestamp;
	    this._acceleration = acceleration;
	    this._positiveThreshold = pt;
	    this._negativeThreshold = nt;
	    this._detected = detected;
	    this._fuzzy = false;
	    this._positions = [];
	    this._stroke = -1;
	    this._discarded = false;
	}
	
	Event.prototype.getSampleAt = function() {
	    return this._timestamp;
	};
	
	Event.prototype.getAcceleration = function() {
	    return this._acceleration;
	};
	
	Event.prototype.isSmallerThanOrEquealToNegativeThreshold = function () {
	    return this._acceleration <= this._negativeThreshold;
	};
	
	Event.prototype.isBiggerThanNegativeThreshold = function () {
	    return this._acceleration > this._negativeThreshold;
	};
	
	Event.prototype.isBiggerThanPositiveThreshold = function () {
	    return this._acceleration > this._positiveThreshold;
	};
	
	Event.prototype.setDetected = function (detected) {
	    this._detected = detected;
	};
	
	Event.prototype.getDetected = function () {
	    return this._detected;
	};
	
	Event.prototype.setStroke = function (stroke) {
	    this._stroke = stroke;
	};
	
	Event.prototype.getStroke = function() {
	    return this._stroke;
	};
	
	Event.prototype.setFuzzy = function (fuzzy) {
	    this._fuzzy = fuzzy;
	};
	
	Event.prototype.isFuzzy = function () {
	    return this._fuzzy === true;
	};
	
	Event.prototype.add = function (event) {
	    this._positions.push(event);
	};
	
	Event.prototype.setDiscarded = function (discarded) {
	    this._discarded = discarded;
	}
	
	Event.prototype.isDiscarded = function () {
	    return this._discarded;
	}
	
	Event.prototype.getPosition = function() {
	    if (this._positions.length > 2) {
	        return this._positions[Math.floor(this._positions.length / 2)].getSampleAt();
	    } else {
	        return this.getSampleAt();
	    }
	};
	
	Event.prototype.relocate = function (before) {
	    for (var i = 0; i < this._positions.length; i++) {
	        if (this._positions[i].getSampleAt() > before.getSampleAt()) {
	            this._positions.splice(i);
	            return;
	        }
	    }
	}
	
	
	Array.prototype.avg = function () {
	    if (this.length ===0) return 0;
	    var value = 0;
	    for (var i = 0; i < this.length; i++) {
	        value += this[i];
	    }
	    return value / this.length;
	};
	
	
	// calculates cadence based on 5 strokes
	Array.prototype.cadence = function() {
	    if (this.length < 5) return undefined;
	    var data = this.slice(0), i = 0, total = 0, current, previous;
	    for (var j = data.length; i <= 5; j--) {
	        current = data[j];
	        if (!previous) {
	            previous = current;
	            i++;
	            continue;
	        }
	
	        total += previous.getSampleAt() - current.getSampleAt();
	
	        previous = current;
	        i++;
	    }
	
	    return total / (i - 1);
	};
	
	
	/**
	 *
	 * @param events
	 * @param value
	 * @returns {number}
	 */
	function indexOf(events, value) {
	    if (events.length === 0) return -1;
	
	    for (var i = 0; i < events.length; i++) {
	        if (events[i] === value) {
	            return i;
	        }
	    }
	    return -1;
	}
	
	
	
	/**
	 * remove all events until 300 milis have passed
	 * @param list
	 * @param milis
	 */
	function after(list, milis) {
	    if (list.length == 0)
	        return [];
	
	    var first = list[0].getSampleAt();
	    for (var i = 0; i < list.length; i++) {
	
	        if (list[i].getSampleAt() > first + milis)
	            break;
	    }
	    return list.slice(i, list.length);
	}
	
	/**
	 * Remove from end
	 *
	 * @param list
	 * @param milis
	 * @returns {Array}
	 */
	function before(list, milis) {
	    if (list.length == 0)
	        return [];
	    var last = list[list.length - 1].getSampleAt();
	    for (var i = (list.length - 1); i >= 0; i--) {
	
	        if (list[i].getSampleAt() < last - milis)
	            break;
	    }
	    return list.slice(0, i);
	}
	
	/**
	 * calculate min and max from a list of events
	 * @param events
	 */
	function minAndMax(events) {
	    // search max and min in events
	    var max = events[0], min = events[0];
	    for (var i = 0; i < events.length; i++) {
	
	        if (events[i].getAcceleration() > max.getAcceleration()) {
	            max = events[i];
	        }
	
	        if (events[i].getAcceleration() < min.getAcceleration()) {
	            min = events[i];
	        }
	    }
	
	    return {
	        min: min,
	        max: max
	    }
	}
	
	function magnitude(strokes) {
	    var magnitude = 0;
	    var i;
	    for (i = 0; i < strokes.length; i++) {
	        magnitude += strokes[i].getAcceleration() - strokes[i].getDetected().getAcceleration();
	    }
	    return magnitude / i;
	}
	
	exports.StrokeDetector = StrokeDetector;

/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';
	
	function Timer($parent) {
	    this.$parent = $parent;
	
	    this.second = 0;
	    this.minute = 0;
	    this.hour = 0;
	    this.duration = 0;
	    this.listener = function(){};
	}
	
	Timer.prototype.start = function(listener) {
	    this.listener = listener;
	    this.timer();
	}
	
	Timer.prototype.pause = function () {
	    clearInterval(this.intervalId);
	}
	
	Timer.prototype.resume = function () {
	    this.timer(this.duration);
	}
	
	Timer.prototype.stop = function() {
	    var self = this;
	    clearInterval(self.intervalId);
	}
	
	Timer.prototype.timer = function(offset) {
	    var self = this
	        , start, time, elapsed;
	
	    offset = offset || 0;
	
	    start = new Date().getTime();
	    this.intervalId = setInterval(function () {
	        time = (new Date().getTime() + offset) - start;
	        elapsed = Math.round(time / 1000);
	        self.duration = time;
	
	        self.minute = Math.floor(elapsed / 60);
	        self.second = elapsed - self.minute * 60;
	
	        if (self.minute > 0) {
	            self.hour = Math.floor(self.minute / 60);
	            self.minute = self.minute - self.hour * 60;
	        }
	
	        self.listener(self.toString());
	
	    }, 1000);
	}
	
	Timer.prototype.zeroPad = function (value) {
	    if (value < 10) {
	        value = "0" + value;
	    }
	    return value;
	}
	
	Timer.prototype.toString = function () {
	    return this.zeroPad(this.hour) + ':' + this.zeroPad(this.minute) + ':' + this.zeroPad(this.second);
	}
	
	
	exports.Timer = Timer;

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var GPS = __webpack_require__(3).GPS;
	
	
	function Distance() {
	    this.counter = 0;
	    this.distance = 0;
	    this.previous = undefined;
	
	}
	
	Distance.prototype.calculate = function (position) {
	
	    if (this.previous !== undefined) {
	        this.takenAt = new Date().getTime();
	        this.distance += GPS.calcDistance(this.previous, position);
	    }
	
	    this.previous = position;
	    return this.distance;
	};
	
	Distance.prototype.getTakenAt = function () {
	    return this.takenAt;
	}
	
	Distance.prototype.getValue = function () {
	    return this.distance;
	};
	
	Distance.prototype.getLatitude = function () {
	    return (this.previous || {coords: {}}).coords.latitude;
	}
	
	Distance.prototype.getLongitude = function () {
	    return (this.previous || {coords: {}}).coords.longitude;
	}
	
	exports.Distance = Distance;

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var utils = __webpack_require__(4);
	
	function Speed() {
	    this.value = 0;
	    this.speeds = [];
	}
	
	
	Speed.prototype.calculate = function (position, distance) {
	
	    // don't display speed until we reach 10 meters
	    if (distance <= 0.01) {
	        return this.value;
	    }
	
	    this.speeds.push(position.coords.speed * 3.6);
	
	    if (this.speeds.length > 3) {
	        this.speeds.shift();
	    }
	
	    if (this.speeds.length === 3) {
	        this.value = utils.avg(this.speeds);
	    }
	
	    return this.value;
	};
	
	Speed.prototype.reset = function () {
	    this.value = 0;
	    this.speeds = [];
	};
	
	Speed.prototype.getValue = function () {
	    return this.value;
	};
	
	exports.Speed = Speed;

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var utils = __webpack_require__(4);
	
	function Pace(convertToImperial) {
	    this.value = 0;
	    this.convertToImperial = convertToImperial;
	}
	
	Pace.prototype.calculate = function (speed) {
	    var value;
	    if (this.convertToImperial === true) {
	        value = 60 / utils.kmToMiles(speed);
	    } else {
	        value = 60 / speed;
	    }
	
	    if (isNaN(value) || !isFinite(value)) return 0;
	
	    var decimal = (value % 1);
	    var minutes = value - decimal;
	    var seconds = Math.round(decimal * 60);
	
	    this.value = minutes + ":" + utils.lpad(seconds, 2);
	
	    return this.value;
	};
	
	
	Pace.prototype.getValue = function () {
	    return this.value;
	};
	
	exports.Pace = Pace;

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var utils = __webpack_require__(4);
	
	function StrokeEfficiency() {}
	
	
	StrokeEfficiency.prototype.calculate = function (speed, interval) {
	    if (speed === undefined || speed === 0) return 0;
	
	    // No strokes detected... set to zero
	    if (interval === undefined || interval === 0) {
	        return 0;
	    }
	
	    var metersPerSecond = (speed * 1000) / 60 / 60;
	    return metersPerSecond * (interval / 1000);
	};
	
	
	exports.StrokeEfficiency = StrokeEfficiency;

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var MeasureFactory = __webpack_require__(18).Measure;
	var utils = __webpack_require__(4);
	
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
	            '    <div class="measure" data-type="pace"></div>',
	            '    <div class="measure" data-type="spm"></div>',
	            '    <div class="measure" data-type="efficiency"></div>',
	            '</div>'
	        ].join('')).appendTo(this.$element);
	    } else {
	
	        $([
	            '<div class="measures">',
	            '    <div class="measure" data-type="speed"></div>',
	            '    <div class="measure" data-type="distance"></div>',
	            '    <div class="measure" data-type="pace"></div>',
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
	        init: '00:00:00'
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
	    },
	    pace: {
	        label: "Pace",
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
	
	exports.Field = Field;

/***/ },
/* 18 */
/***/ function(module, exports) {

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

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var utils = __webpack_require__(4);
	
	function SessionSummaryView(page, context, sessionSummaryArguments) {
	    var self           = this,
	        session        = sessionSummaryArguments.session,
	        isPastSession  = sessionSummaryArguments.isPastSession,
	        $page          = $(page),
	        $duration      = $page.find('[data-selector="duration"]'),
	        $distance      = $page.find('[data-selector="distance"]'),
	        $avgSpeed      = $page.find('[data-selector="avg-speed"]'),
	        $maxSpeed      = $page.find('[data-selector="max-speed"]'),
	        $avgSPM        = $page.find('[data-selector="avg-spm"]'),
	        $maxSPM        = $page.find('[data-selector="max-spm"]'),
	        $avgEfficiency = $page.find('[data-selector="avg-efficiency"]'),
	        $maxEfficiency = $page.find('[data-selector="max-efficiency"]'),
	        $congrats      = $page.find('#summary-congrats'),
	        $details       = $page.find('#summary-details'),
	        $finish        = $page.find('#summary-finish'),
	        $back          = $page.find('#summary-back');
	
	    // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
	    if (isPastSession === true) {
	        $finish.hide();
	        $congrats.hide();
	        $back.show();
	        $details.css('display', 'table-cell');
	    }
	
	    $page.find('#summary-congrats-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm:ss'));
	    $page.find('#summary-details-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm:ss'));
	
	    var duration = moment.duration(session.getSessionEnd() - session.getSessionStart());
	    var durationFormatted = utils.lpad(duration.hours(), 2)
	        + ':' + utils.lpad(duration.minutes(), 2) + ":" + utils.lpad(duration.seconds(), 2);
	
	    var distance = context.displayMetric('distance', session.getDistance());
	    var avgSpeed = context.displayMetric('speed', session.getAvgSpeed());
	    var maxSpeed = context.displayMetric('speed', session.getTopSpeed());
	    var avgSPM = context.displayMetric('spm', session.getAvgSpm());
	    var maxSPM = context.displayMetric('spm', session.getTopSpm());
	    var avgEfficiency = context.displayMetric('efficiency', session.getAvgEfficiency());
	    var maxEfficiency = context.displayMetric('efficiency', session.getTopEfficiency());
	
	    $duration.html('<b>' + durationFormatted + '</b>' + ' H');
	    $distance.html('<b>' + distance + '</b> ' + context.getUnit('distance'));
	    $avgSpeed.html('<b>' + avgSpeed + '</b> ' + context.getUnit('speed'));
	    $maxSpeed.html('<b>' + maxSpeed + '</b> ' + context.getUnit('speed'));
	    $avgSPM.html('<b>' + avgSPM + '</b> ' + context.getUnit('spm'));
	    $maxSPM.html('<b>' + maxSPM + '</b> ' + context.getUnit('spm'));
	    $avgEfficiency.html('<b>' + avgEfficiency + '</b> ' + context.getUnit('efficiency'));
	    $maxEfficiency.html('<b>' + maxEfficiency + '</b> ' + context.getUnit('efficiency'));
	
	    $finish.on('tap', function () {
	
	        App.load('home', undefined, undefined, function () {
	            App.removeFromStack();
	        });
	    });
	}
	
	
	exports.SessionSummaryView = SessionSummaryView;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Settings = __webpack_require__(21);
	var Api = __webpack_require__(10);
	
	function SettingsView(page, settings) {
	    var $calibration = $('#calibration', page)
	        , $back = $('.back-button', page)
	        , $logout = $('#logout', page)
	        , $page = $(page)
	        , $units = $('#pick-units', page)
	        , $wifi = $('#wifi', page)
	        , $calibrationHelp = $('.settings-calibrate-help', page)
	        , $layout = $('#layout', page);
	
	    if (settings.getUnits() === Settings.CONSTANTS.MI) {
	        $units.prop('checked', true);
	    }
	
	    if (settings.isSyncOnlyOnWifi()) {
	        $wifi.prop('checked', true);
	    }
	
	    if (settings.isRestoreLayout()) {
	        $layout.prop('checked', true);
	    }
	
	    $calibration.on('tap', function () {
	        App.load('calibration');
	    });
	
	    $calibrationHelp.on('tap', function () {
	        App.load('calibration-help');
	    });
	
	    $logout.on('tap', function () {
	        Api.Auth.logout().done(function () {
	            App.load('login');
	        });
	    });
	
	    $back.on('tap', function () {
	        App.back('home', function () {
	        });
	    });
	
	    $(page).on('appDestroy', function () {
	        $calibration.off('touchstart');
	        $back.off('touchstart');
	    });
	
	    $logout.find('.settings-facebook').html("Logout (" + Api.User.getProfile().name + ")");
	
	    $('[data-selector="version"]', page).html("v. 0.8.4 / u. " + Api.User.getId());
	
	    $('.settings-website-text', page).on('click', function () {
	        window.open('https://app.gopaddler.com/', '_system');
	    });
	
	    $page.on('appBeforeBack', function (e) {
	        var units = $units.is(':checked') ? Settings.CONSTANTS.MI : Settings.CONSTANTS.KM;
	        var wifi = $wifi.is(':checked') ;
	        var layout = $layout.is(':checked');
	        Settings.saveSettings(units, wifi, layout);
	
	        // update referece that is being used globally
	        settings.setUnits(units);
	        settings.setSyncOnlyOnWifi(wifi);
	        settings.setRestoreLayout(layout);
	    });
	
	}
	
	
	exports.SettingsView = SettingsView;

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var db = __webpack_require__(8);
	
	var CONSTANTS  = {
	    KM: 'K',
	    MI: 'M'
	};
	
	function Settings(version, units, syncOnlyOnWifi, restoreLayout, showTouchGestures, showCalibrationTips) {
	    this._version = version;
	    this._units = units;
	    this._syncOnlyOnWifi = syncOnlyOnWifi;
	    this._restoreLayout = restoreLayout;
	    this._showTouchGestures = showTouchGestures === undefined ? true : showTouchGestures;
	    this._showCalibrationTips = showCalibrationTips === undefined ? true : showCalibrationTips;
	}
	
	Settings.prototype.getVersion = function() {
	    return this._version;
	};
	
	Settings.prototype.setVersion = function(version) {
	    this._version = version;
	};
	
	Settings.prototype.getUnits = function() {
	    return this._units;
	};
	
	Settings.prototype.setUnits = function(units) {
	    this._units = units;
	};
	
	Settings.prototype.isImperial = function(){
	    return this._units === CONSTANTS.MI;
	};
	
	Settings.prototype.isSyncOnlyOnWifi = function() {
	    return this._syncOnlyOnWifi;
	};
	
	Settings.prototype.setSyncOnlyOnWifi = function(syncOnlyOnWifi) {
	    this._syncOnlyOnWifi = syncOnlyOnWifi;
	};
	
	Settings.prototype.isRestoreLayout = function() {
	    return this._restoreLayout;
	};
	
	Settings.prototype.setRestoreLayout = function(restoreLayout) {
	    this._restoreLayout = restoreLayout;
	};
	
	Settings.prototype.isShowTouchGestures = function () {
	    return this._showTouchGestures;
	};
	
	Settings.prototype.setShowTouchGestures = function (showTouchGestures) {
	    this._showTouchGestures = showTouchGestures;
	};
	
	Settings.prototype.isShowCalibrationTips = function () {
	    return this._showCalibrationTips;
	};
	
	Settings.prototype.setShowCalibrationTips = function (showCalibrationTips) {
	    this._showCalibrationTips = showCalibrationTips;
	};
	
	
	
	Settings.prototype.touchGesturesShown = function () {
	    var connection = db.getConnection();
	    connection.executeSql("update settings set show_touch_events_tips = ?", [0]);
	    this.setShowTouchGestures(false);
	}
	
	Settings.prototype.calibrationTipsShown = function () {
	    var connection = db.getConnection();
	    connection.executeSql("update settings set show_calibration_tips = ?", [0]);
	    this.setShowCalibrationTips(false);
	}
	
	
	function loadSettings() {
	    var defer = $.Deferred();
	    var connection = db.getConnection();
	
	    connection.executeSql("SELECT * FROM settings", [], function success(res) {
	        var row = res.rows.item(0);
	        defer.resolve(new Settings(row.version, row.units, row.sync_wifi, row.restore_layout, row.show_touch_events_tips === 1, row.show_calibration_tips === 1));
	    }, function error(e) {
	        console.log('error loding settings... defaulting');
	        defer.reject(err, new Settings(-1, CONSTANTS.KM, true, true));
	    });
	
	    return defer.promise();
	}
	
	function saveSettings(units, syncOnWikiOnly, restoreLayout) {
	    var connection = db.getConnection();
	    connection.executeSql("update settings set units = ?, sync_wifi = ?, restore_layout = ?"
	        , [units, syncOnWikiOnly ? 1 : 0, restoreLayout ? 1 : 0]);
	}
	
	exports.loadSettings = loadSettings;
	exports.saveSettings = saveSettings;
	exports.Settings = Settings;
	exports.CONSTANTS  = CONSTANTS;
	
	
	
	
	
	
	
	


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Calibration = __webpack_require__(6).Calibration;
	var Session = __webpack_require__(7).Session;
	var Api = __webpack_require__(10);
	var Dialog = __webpack_require__(5);
	
	function HomeView(page, context, request) {
	    request = request || {};
	
	    var $page = $(page)
	        , self = this
	        , $sessions = $page.find('#btn-sessions')
	        , $session = $page.find('#btn-session')
	        , $settings = $page.find('#btn-settings')
	        ;
	
	    self.$homeLastRecord = $page.find('.home-last-record');
	    self.$homeLastRecordDate = $page.find('.home-last-record-date');
	
	    $sessions.on('tap', function () {
	        App.load('sessions');
	    });
	
	    $session.on('tap', function () {
	        var calibration = Calibration.load();
	        if (calibration === undefined) {
	            showNoCalibrationModal($(page), context);
	            return false;
	        }
	        context.navigate('session', false, undefined);
	    });
	
	    $settings.on('tap', function () {
	        App.load('settings');
	    });
	
	    $page.find('.home-username-bold').html(Api.User.getProfile().name);
	
	    self.updateLastSessionDate();
	
	    $page.on('appShow', function () {
	        self.updateLastSessionDate();
	    });
	
	    // store device information
	    Api.User.saveDevice({
	        cordova: device.cordova,
	        model: device.model,
	        platform: device.platform,
	        uuid: device.uuid,
	        version: device.version,
	        manufacturer: device.manufacturer,
	        isVirtual: device.isVirtual,
	        serial: device.serial,
	        paddler: "0.8.4"
	    });
	
	
	    // check if we are comming from calibration and show dialog if that's the case
	   if (request.from === 'calibration') {
	       showFirstCalibrationCompletedModal($(page), context);
	   }
	}
	
	HomeView.prototype.updateLastSessionDate = function () {
	    var self = this;
	    Session.last().then(function (session) {
	        if (session === undefined) {
	            self.$homeLastRecord.html('No sessions yet');
	        } else {
	            self.$homeLastRecordDate.html(moment(session.getSessionStart()).format('MMM D'));
	        }
	    });
	};
	
	
	
	function showNoCalibrationModal($page, context) {
	    var html = [
	        '<div class="info-modal-body">',
	            '<div class="info-modal-title vh_height10 vh_line-height10">No calibration found</div>',
	            '<div class="info-modal-content vh_height26"">',
	                '<p style="text-align: center">Before you start, we need to adjust to your mount system!</p>',
	                '<p class="vh_line-height11" style="text-align: center">Don\'t worry - it will only take a few seconds...</p>',
	            '</div>',
	            '<div class="info-modal-controls vh_height15 vh_line-height15">',
	                '<div class="info-modal-secondary-action">Try it</div>',
	                '<div class="info-modal-primary-action">Calibrate</div>',
	            '</div>',
	        '</div>'
	    ];
	
	    var $body = $(html.join(''))
	        , $skip = $body.find('.info-modal-secondary-action')
	        , $calibrate = $body.find('.info-modal-primary-action');
	
	    $skip.on('tap', function () {
	        Dialog.hideModal();
	        context.navigate('session', true);
	
	    });
	
	    $calibrate.on('tap', function () {
	        Dialog.hideModal();
	        context.navigate('calibration', true, {from: "start-session"});
	    });
	
	    Dialog.showModal($body, {center: true});
	}
	
	function showFirstCalibrationCompletedModal($page, context) {
	    var html = [
	        '<div class="info-modal-body">',
	        '<div class="info-modal-title vh_height10 vh_line-height10">Calibration completed</div>',
	        '<div class="info-modal-content vh_height26"">',
	        '<p style="text-align: center">Thanks... now you can go ahead and start a new session</p>',
	        '</div>',
	        '<div class="info-modal-controls vh_height15 vh_line-height15">',
	        '<div class="info-modal-primary-action">OK</div>',
	        '</div>',
	        '</div>'
	    ];
	
	    var $body = $(html.join(''))
	        , $ok = $body.find('.info-modal-primary-action');
	
	    $ok.on('tap', function () {
	        Dialog.hideModal();
	    });
	
	    Dialog.showModal($body, {center: true});
	}
	
	
	
	exports.HomeView = HomeView;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Api = __webpack_require__(10);
	
	function LoginView(page) {
	
	    var $page = $(page), img;
	
	    if (window.devicePixelRatio == 0.75) {
	        img = 'login-ldpi.png';
	    }
	    else if (window.devicePixelRatio == 1) {
	        img = 'login-mdpi.png';
	    }
	    else if (window.devicePixelRatio == 1.5) {
	        img = 'login-hdpi.png';
	    }
	    else if (window.devicePixelRatio == 2) {
	        img = 'login-xdpi.png';
	    }
	
	    $page.find('.app-page').css({"background-image": "images/" + img});
	
	    var $login = $('#facebook', page);
	
	    $login.off('touchstart').on('touchstart', function () {
	
	        Api.Auth.login().done(function () {
	
	            App.load('home');
	
	        }).fail(function (err) {
	
	            alert(err);
	        });
	    });
	}
	
	
	exports.LoginView = LoginView;

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var THIS_MONTH_PERIOD_FILTER = 'this-month',
	    LAST_MONTH_PERIOD_FILTER = 'last-month',
	
	    utils   = __webpack_require__(4),
	    Session = __webpack_require__(7).Session,
	
	    appContext,
	    $page,
	    $sessionList;
	
	/**
	 * Filter list of sessions by a given period
	 *
	 * @param {jQuery} $filter
	 */
	function filterSessionsByPeriod($filter) {
	    var $sessionPeriodFilterButton = $page.find('#session-period-filter-button'),
	        period = $filter.data('period');
	
	    // adjust sessions according to chosen period
	    Session.all(function (sessions) {
	        var nbr = sessions.length;
	
	        if (nbr > 0) $sessionList.empty().css('height', 'auto');
	
	        for (var i = 0; i < nbr; i++) {
	            switch (period) {
	                case THIS_MONTH_PERIOD_FILTER:
	                    if (moment(sessions[i].sessionStart).month() === moment(new Date()).month()) {
	                        addSessionToSessionList(sessions[i]);
	                    }
	
	                    break;
	                case LAST_MONTH_PERIOD_FILTER:
	                    $sessionPeriodFilterButton.html('Last Month');
	                    if (moment(sessions[i].sessionStart).month() === moment(new Date()).subtract(1, 'months').month()) {
	                        addSessionToSessionList(sessions[i]);
	                    }
	
	                    break;
	                default:
	                    $sessionPeriodFilterButton.html('All Sessions');
	                    addSessionToSessionList(sessions[i]);
	            }
	        }
	    });
	
	    // change filter label
	    $page.find('.app-options-line.selected').removeClass('selected');
	    $filter.addClass('selected');
	
	    switch (period) {
	        case THIS_MONTH_PERIOD_FILTER:
	            $sessionPeriodFilterButton.html('Last 30 Days');
	            break;
	        case LAST_MONTH_PERIOD_FILTER:
	            $sessionPeriodFilterButton.html('Last Month');
	            break;
	        default:
	            $sessionPeriodFilterButton.html('All Sessions');
	    }
	
	    // update scroll to new height
	    new IScroll('#sessions-wrapper');
	}
	
	/**
	 * Add given session to the list of sessions
	 *
	 * @param {object} session
	 */
	function addSessionToSessionList(session) {
	    var $li       = $('<li class="session-row vh_height20" data-id="' + session.id + '"></li>'),
	        $main     = $('<div class="session-row-data-wrapper"></div>'),
	        sessionAt = moment(new Date(session.getSessionStart())),
	        duration  = moment.duration(session.getSessionEnd() - session.getSessionStart()),
	        hours     = duration.hours(),
	        minutes   = duration.minutes(),
	        dDisplay  = utils.lpad(hours, 2) + ':' + utils.lpad(minutes, 2) + ' H',
	        distance  = session.getDistance();
	
	    $('<div class="session-row-wrapper"></div>')
	        .append($main)
	        .append($('<div class="session-row-delete"></div>')
	            .append($('<div style="display:table;width:100%;height:100%"></div>')
	                .append($('<div class="session-row-delete-btn"></div>').attr("session-id", session.getId()).text("delete"))))
	        .appendTo($li);
	
	    if (appContext.preferences().isImperial()) {
	        distance = utils.kmToMiles(distance);
	    }
	
	    $('<div class="session-row-data"></div>')
	        .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("MMM D")))
	        .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("HH:mm:ss")))
	        .append($("<div style=\"display:table-cell;text-transform:none\"/>").html(dDisplay))
	        .append($("<div style=\"display:table-cell\"/>").html('<b>' + utils.round2(distance || 0) + ' ' + appContext.getUnit('distance') + '</b>'))
	        .appendTo($main);
	
	    // on a session tap, open session-summary with its details
	    $main.on('tap', function () {
	        App.load('session-summary', {
	            session: session,
	            isPastSession: true
	        });
	    });
	
	    $li.appendTo($sessionList);
	}
	
	/**
	 * Initialize Sessions view
	 *
	 * @param page
	 * @param context
	 */
	function SessionsView(page, context) {
	    var self = this,
	        $back = $('.back-button', page),
	        $sessionPeriodFilter,
	        $sessionPeriodFilterOptions,
	        $sessionPeriodFilterButton,
	        nbr = 0;
	
	    appContext   = context;
	    $page        = $(page);
	    $sessionList = $page.find('#local-sessions');
	
	    $sessionPeriodFilter        = $page.find('#session-period-filter');
	    $sessionPeriodFilterOptions = $sessionPeriodFilter.find('.app-options-line');
	    $sessionPeriodFilterButton  = $page.find('#session-period-filter-button');
	
	    // toggle session period filter dropdown when button is tapped
	    $sessionPeriodFilterButton.on('tap', function () {
	        $sessionPeriodFilter.toggle();
	    });
	
	    // filter session when a filter is applied
	    $sessionPeriodFilterOptions.on('tap', function () {
	        filterSessionsByPeriod($(this));
	        $sessionPeriodFilter.toggle();
	    });
	
	    // bind event to back button
	    $back.on('touchstart', function () {
	        App.back('home', function () {
	        });
	    });
	
	    $page.on('appDestroy', function () {
	        $back.off('touchstart');
	    });
	
	    // handle delete
	    self.lock = {};
	    self.progress = {};
	    $sessionList.on('touchstart', '.session-row-delete-btn', function (e) {
	        var $el = $(event.target);
	        var sessionId = $el.attr('session-id');
	
	        if (self.lock[sessionId] === true) {
	            self.cancelDelete($el, sessionId);
	            return;
	        }
	
	        self.confirmDelete($el, sessionId);
	        e.preventDefault();
	        e.stopImmediatePropagation();
	    });
	
	    // load sessions
	    Session.all(function (sessions) {
	        nbr = sessions.length;
	
	        if (nbr > 0) $sessionList.empty().css('height', 'auto');
	
	        for (var i = 0; i < nbr; i++) {
	            addSessionToSessionList(sessions[i]);
	        }
	    });
	
	    Session.sessionsSummary().then(function (data) {
	        var time = Math.floor(data.duration / 1000);
	        var hours = Math.floor(time / 3600);
	        time = time - hours * 3600;
	        var minutes = Math.floor(time / 60);
	        var seconds = time - minutes * 60;
	
	        $('#total-distance', page).text(utils.round2(data.distance));
	        $('#top-speed', page).text(utils.round2(data.speed));
	        $('#total-duration', page).text([utils.lpad(hours, 2), utils.lpad(minutes, 2), utils.lpad(seconds, 2)].join(':'));
	    });
	
	    $page.on('appShow', function () {
	
	        // initialize session period filter datepicker
	        $page.find('#session-period-datepicker').dateRangePicker({
	            inline:          true,
	            alwaysOpen:      true,
	            container:       '#session-period-datepicker',
	            singleMonth:     true,
	            showShortcuts:   false,
	            showTopbar:      false,
	            hoveringTooltip: false,
	            language:        'en'
	        });
	
	        if (nbr === 0) return;
	
	        var width = $('.session-row-delete', page).width();
	
	        Swiped.init({
	            query: 'li',
	            list: true,
	            left: 0,
	            right: width
	        });
	
	        new IScroll($('#sessions-wrapper', page)[0], {});
	    });
	}
	
	
	SessionsView.prototype.confirmDelete = function ($button, sessionId) {
	    var self = this;
	
	    self.lock[sessionId] = true;
	
	    // change button to cancel
	    $button.addClass('cancel');
	    $button.text('cancel');
	
	    // add progress in order to wait for delete
	    var $parent = $button.closest('li');
	    var $row = $('<li/>').insertAfter($parent);
	    $('<li/>').insertAfter($row);
	    var $progress = $('<div class="progress-waiting-cancel"/>').appendTo($row);
	
	    self.progress[sessionId] = {$dom: $row, start: new Date().getTime()};
	
	    $({
	        property: 0
	    }).animate({
	            property: 100
	        }, {
	            duration: 5000,
	            step: function () {
	                var _percent = Math.round(this.property);
	                $progress.css("width", _percent + "%");
	                if (_percent == 105) {
	                    $progress.addClass("done");
	                }
	            },
	            complete: function () {
	                console.log(new Date().getTime() - self.progress[sessionId].start);
	                if (self.lock[sessionId] !== true || new Date().getTime() - self.progress[sessionId].start < 5000) {
	                    console.log('canceled');
	                    return;
	                }
	
	                Session.delete(parseInt(sessionId))
	                    .then(function () {
	                        $button.closest('li').remove();
	                        $row.next().remove();
	                        $row.remove();
	                        self.lock[sessionId] = false;
	                    });
	            }
	        });
	};
	
	SessionsView.prototype.cancelDelete = function ($button, sessionId) {
	    var self = this;
	    self.lock[sessionId] = false;
	    $button.removeClass('cancel');
	    $button.text('delete');
	    self.progress[sessionId].$dom.next().remove();
	    self.progress[sessionId].$dom.remove();
	};
	
	exports.SessionsView = SessionsView;


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Calibrate = __webpack_require__(26).Calibrate;
	
	function CalibrationView(page, context, request) {
	    var $page = $(page)
	        , $content = $page.find('.app-content')
	        , $calibrate = $page.find('.calibrate')
	        , isStartSession = !!(request.from === 'start-session');
	
	    setTimeout(function () {
	        $content.css({"line-height": $page.height() + "px"});
	    }, 0);
	
	    setTimeout(function () {
	        var cal = new Calibrate(function () {
	            $calibrate.removeClass('listening');
	            $calibrate.addClass('finished');
	            $calibrate.html("Done!");
	            setTimeout(function () {
	                if (isStartSession)
	                    context.navigate('home', true, {from: "calibration"});
	                else
	                    App.back();
	            }, 1500);
	        });
	        cal.start();
	
	    }, 1000);
	}
	
	exports.CalibrationView = CalibrationView;

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Calibration = __webpack_require__(6).Calibration;
	var utils = __webpack_require__(4);
	
	function Calibrate (callback) {
	    this.callback = callback;
	    this.watchId = undefined;
	
	    this.GRAVITY_EARTH = 9.80665;
	    this.MEASURES = 300;
	}
	
	Calibrate.prototype.start = function() {
	    var self = this;
	
	    var i = 1, x = 0, y = 0, z = 0;
	
	    function onSuccess(acceleration) {
	        document.PREVENT_SYNC = true;
	
	        if (i === self.MEASURES) {
	            self.stop();
	            document.PREVENT_SYNC = false;
	            self.calculate(x, y, z);
	            self.callback.call();
	        }
	
	        var magnitude = Math.sqrt(Math.pow(acceleration.x, 2)
	            + Math.pow(acceleration.y, 2)
	            + Math.pow(acceleration.z, 2)) / self.GRAVITY_EARTH;
	
	        // TODO - check for to much noise
	
	        x += acceleration.x;
	        y += acceleration.y;
	        z += acceleration.z;
	        i++;
	
	    }
	
	    function onError() {
	        console.log('onError!');
	    }
	
	    setTimeout(function () {
	        var options = { frequency: 40 };
	        try {
	            self.watchId = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
	        } catch (e) {
	            console.log('hmmm... browser?');
	        }
	    }, 2500);
	};
	
	Calibrate.prototype.calculate = function (sumx, sumy, sumz) {
	    var self = this;
	    var avgX = sumx / self.MEASURES;
	    var avgY = sumy / self.MEASURES;
	    var avgZ = sumz / self.MEASURES;
	    var angleZ;
	    var predominantAxis;
	
	    if (avgZ < 9.81) {
	        angleZ = Math.asin(avgZ / 9.81);
	    } else {
	        angleZ = Math.asin(1);
	    }
	
	    if (angleZ < utils.toRadians(45)) {
	        predominantAxis = 2;
	    } else {
	        predominantAxis = 0;
	    }
	
	    var factorX = utils.toRadians(90) - angleZ;
	    factorX = factorX ? factorX : 1;
	
	    var factorZ = Math.cos(angleZ);
	    factorZ = factorZ ? factorZ : 1;
	
	    self.store(predominantAxis, angleZ, avgX, avgY, avgZ, factorX, factorZ);
	}
	
	Calibrate.prototype.stop = function () {
	    var self = this;
	    navigator.accelerometer.clearWatch(self.watchId);
	}
	
	Calibrate.prototype.store = function (predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorZ) {
	    var round = function(value) {
	        return Math.round(value * 10000000000000000) / 10000000000000000
	    };
	
	    new Calibration(predominant, round(angleZ), round(noiseX), round(noiseY), round(noiseZ), round(factorX), round(factorZ)).save();
	}
	
	Calibrate.load = function () {
	    var obj = JSON.parse(window.localStorage.getItem("calibration"));
	    if (!obj) {
	        return undefined;
	    }
	    return new Calibration(obj.predominant, obj.angleZ, obj.noiseX, obj.noiseY, obj.noiseZ, obj.factorX, obj.factorZ);
	}
	
	
	exports.Calibrate = Calibrate;

/***/ },
/* 27 */
/***/ function(module, exports) {

	'use strict';
	
	
	function CalibrationHelpView(page, context, request) {
	    request = request || {};
	
	    var $page = $(page)
	        , $content = $page.find('[data-selector="slick"]')
	        , $gotIt
	        , isStartSession = !!(request.from === 'start-session');
	
	
	    // adjust slideshow for when the user reaches it from start session or from help
	    if (isStartSession) {
	        $page.find('[data-step="3"]').find('.got-it').remove();
	    } else {
	        $page.find('[data-step="4"]').remove();
	    }
	
	    $gotIt = $page.find('.got-it');
	
	    setTimeout(function () {
	        $content.slick({
	            dots: true,
	            speed: 300,
	            infinite: false,
	            arrows: false
	        });
	    }, 0);
	
	    $gotIt.on('tap', function () {
	        if (context.preferences().isShowCalibrationTips()) {
	            context.preferences().calibrationTipsShown();
	        }
	        if (isStartSession) context.navigate('calibration', true, {from: "start-session"});
	        else App.back();
	    });
	}
	
	exports.CalibrationHelpView = CalibrationHelpView;

/***/ },
/* 28 */
/***/ function(module, exports) {

	'use strict';
	
	
	function SessionTipsView(page, context) {
	    var $page = $(page)
	        , $content = $page.find('[data-selector="slick"]')
	        , $gotIt = $page.find('.got-it');
	
	    setTimeout(function () {
	        $content.slick({
	            dots: true,
	            speed: 300,
	            infinite: false,
	            arrows: false
	        });
	    }, 0);
	
	    $gotIt.on('tap', function () {
	        // store that we have shown the tutorial to the user
	        context.preferences().touchGesturesShown();
	
	        // navigate directly so it works in browser in dev mode
	        App.destroyStack();
	        App.load('session');
	    });
	}
	
	exports.SessionTipsView = SessionTipsView;

/***/ },
/* 29 */
/***/ function(module, exports) {

	'use strict';
	
	// override functions when in testing (deviceready not triggered)
	// --------------------------------------------------------------
	
	if (!window.sqlitePlugin) {
	
	    var _open = window.openDatabase;
	    window.sqlitePlugin = window;
	
	    window.sqlitePlugin.openDatabase = function (args) {
	        return _open(args.name, "1.0", "Static desc", 200000);
	    }
	}
	
	function emulateCordova () {
	    var _open = window.openDatabase;
	    window.sqlitePlugin = window;
	
	    var executeSql = function (sql, args, success, error) {
	        success = success || function(){};
	        if (sql.toLowerCase().substr(0, 3) === 'ins') {
	            success({insertId: 1234});
	        } else if (sql === "SELECT * FROM settings") {
	            var data = [
	                {version: 1, units: 'K', sync_wifi: true, restore_layout: true}
	            ];
	            success({rows: {length: 14, item: function (index) {
	                return data[index];
	            }}})
	        } else {
	            var data = [
	                {id: 1, session_start: new Date(), distance: 1, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 2, session_start: new Date(new Date().getTime() - 86400000), distance: 2, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 3, session_start: new Date(new Date().getTime() - (2 * 86400000)), distance: 3, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 4, session_start: new Date(new Date().getTime() - (3 * 86400000)), distance: 4, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 5, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 5, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 6, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 6, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 7, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 7, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 8, session_start: new Date(new Date().getTime() - (5 * 86400000)), distance: 8, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 9, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 9, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 10, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 10, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 11, session_start: new Date(new Date().getTime() - (7 * 86400000)), distance: 11, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 12, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 12, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 13, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 13, session_end: new Date(new Date().getTime() + 3600000)},
	                {id: 14, session_start: new Date(new Date().getTime() - (9 * 86400000)), distance: 14, session_end: new Date(new Date().getTime() + 3600000)}
	            ];
	            success({rows: {length: 14, item: function (index) {
	                return data[index];
	            }}})
	        }
	    };
	
	    window.sqlitePlugin.openDatabase = function (args) {
	        return {
	            executeSql: executeSql,
	            transaction: function (callback) {
	                setTimeout(function () {
	                    callback({executeSql: executeSql});
	                }, 0);
	            }
	        }
	    };
	
	    navigator.connection = navigator.connection || {};
	    window.Connection = {"WIFI": 1, "ETHERNET": 2};
	
	    window.analytics = {startTrackerWithId: function () {
	        }, trackView: function () {
	        }, setUserId: function () {
	    }};
	
	    window.screen.lockOrientation = function(){};
	    window.device = {};
	
	    navigator.geolocation.watchPosition = function (callback) {
	        var latitude, longitude;
	        return setInterval(function () {
	            if (latitude === undefined) {
	                latitude = Math.random() + 1;
	                longitude = Math.random() + 1;
	            }
	            latitude = latitude + Math.random() / 2 / 10000;
	            longitude = longitude + Math.random() / 2 / 10000;
	
	
	            callback({
	                timestamp: new Date().getTime(),
	                coords: {
	                    accuracy: 1,
	                    latitude: latitude,
	                    longitude: longitude,
	                    speed: Math.random() * 10 + 10
	                }
	            })
	        }, 1000);
	    };
	
	    navigator.geolocation.clearWatch = function (id) {
	        clearInterval(id);
	    };
	
	    navigator.accelerometer = navigator.accelerometer || {};
	    navigator.accelerometer.watchAcceleration = function (callback) {
	        return setInterval(function () {
	            callback({
	                timestamp: new Date().getTime(),
	                x: 1,
	                y: 1,
	                z: 1
	            });
	        }, 10);
	    };
	
	    navigator.accelerometer.clearWatch = function (id) {
	        clearInterval(id);
	    };
	}
	
	jQuery.fn.center = function () {
	    this.css("position","absolute");
	    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
	        $(window).scrollTop()) + "px");
	    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
	        $(window).scrollLeft()) + "px");
	    return this;
	};
	
	exports.emulateCordova = emulateCordova;


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var IO = __webpack_require__(2).IO;
	var Utils = __webpack_require__(4);
	var Session = __webpack_require__(7).Session;
	var Api = __webpack_require__(10);
	
	var processing = {};
	
	function sync() {
	    if (document.PREVENT_SYNC === true) return;
	
	    if (!Utils.onWifi()) {
	        return;
	    }
	
	    var isOffline = 'onLine' in navigator && !navigator.onLine;
	
	    if (isOffline)
	        return;
	
	    Session.findAllNotSynced(function (sessions) {
	        for (var i = 0; i < sessions.length; i++) {
	            if (processing[sessions[i].getId()] === true)
	                continue;
	
	            // set lock
	            processing[sessions[i].getId()] = true;
	
	            if (sessions[i].isSynced()) {
	                uploadDebugData(sessions[i]);
	            } else {
	                uploadSession(sessions[i]);
	            }
	        }
	    });
	}
	
	
	function uploadSession(localSession) {
	
	    var defer = $.Deferred();
	
	    localSession.createAPISession().then(function (trainingSession) {
	
	        Api.TrainingSessions.save(trainingSession).done(function (id) {
	
	            localSession.setRemoteId(id);
	
	            Session.synced(localSession.getRemoteId(), localSession.getId());
	
	            // upload debug data, if we have a file
	            if (trainingSession.data.length === 0) {
	                Session.debugSyncFinished(localSession.getId(), true);
	                delete processing[localSession.getId()];
	            } else {
	                uploadDebugData(localSession);
	            }
	
	        }).fail(function (err) {
	
	            console.log('save failed', err);
	            delete processing[localSession.getId()];
	        });
	    });
	
	    return defer.promise();
	}
	
	
	function loadFile(filename) {
	    var defer = $.Deferred();
	    IO.open(filename).then(IO.read).then(function (csv) {
	        defer.resolve(csv.split('\n'));
	    });
	    return defer.promise();
	}
	
	
	function uploadDebugData(session) {
	
	    var self = this,
	        sensorData = [],
	        record,
	        defer = $.Deferred();
	
	    if (!session.getDebugFile()) {
	        delete processing[session.getId()];
	        defer.resolve();
	        return defer.promise();
	    }
	
	    loadFile(session.getDebugFile()).then(function (rows) {
	
	        var i = 0;
	
	        if (session.getDbgSyncedRows() > 0) {
	            i = session.getDbgSyncedRows() - 1;
	        } else {
	            // 1st time - register sync start
	            Session.startDebugSync(session.getId(), sensorData.length);
	        }
	
	        for (var l = rows.length; i < l; i++) {
	            if (!rows[0]) continue;
	
	            record = rows[i].split(';');
	            sensorData.push({
	                timestamp: record[0],
	                x: record[1],
	                y: record[2],
	                z: record[3],
	                value: record[4]
	            });
	        }
	
	        var SIZE = 1000;
	        (function loopAsync() {
	            var payload = sensorData.splice(0, SIZE);
	
	            if (payload.length === 0) {
	                Session.debugSyncFinished(session.getId(), true);
	                return;
	            }
	
	            Api.DebugSessions.save({trainingSession: session.getRemoteId(), data: payload}).done(function () {
	
	                    Session.debugSynced(session.getId(), SIZE);
	
	                    if (sensorData.length > 0) {
	                        loopAsync();
	                        return;
	                    }
	
	                    console.log('finish uploading session ' + session.getId());
	                    Session.debugSyncFinished(session.getId(), true);
	                    defer.resolve();
	                })
	                .fail(function (e) {
	
	                    console.log('error saving debug data: ', e);
	
	                    Session.get(session.getId()).then(function (s) {
	
	                        if (s.getDebugAttempt() < 3) {
	                            Session.incrementAttempt(session.getId()).then(function () {
	                                loopAsync();
	                            });
	                            return;
	                        }
	
	                        Session.debugSyncFinished(session.getId(), false);
	                        defer.reject(e);
	
	                    }).fail(function () {
	
	                        Session.debugSyncFinished(session.getId(), false);
	                        defer.reject(e);
	                    });
	                });
	        })();
	    });
	    return defer.promise();
	}
	
	exports.start = function () {
	    var self = this;
	    setTimeout(function () {
	        setInterval(sync.bind(self), 10000);
	    }, 10000);
	};


/***/ },
/* 31 */
/***/ function(module, exports) {

	var init = function () {
	    window.analytics.startTrackerWithId('UA-73212702-1');
	};
	
	
	var view = function (name) {
	    window.analytics.trackView(name);
	};
	
	var user = function (id) {
	    window.analytics.setUserId(id);
	};
	
	
	exports.init = init;
	exports.setView = view;
	exports.setUser = user;

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var utils = __webpack_require__(4);
	
	
	var units = {
	
	    metric: {
	        timer: {
	            label: {regular: "", large: ""},
	            round: false
	        },
	        speed: {
	            label: {regular: "Km/h", large: "Km/h"},
	            decimalPlaces: 1
	        },
	        distance: {
	            label: {regular: "Km", large: "Km"},
	            decimalPlaces: 2
	        },
	        spm: {
	            label: {regular: "SPM", large: "SPM"},
	            decimalPlaces: 1
	        },
	        efficiency: {
	            label: {regular: "m", large: "meters"},
	            decimalPlaces: 1
	        },
	        pace: {
	            label: {regular: "Min/Km", large: "Min/Km"},
	            round: false
	        }
	    },
	    imperial: {
	        timer: {
	            label: {regular: "", large: ""},
	            round: false
	        },
	        speed: {
	            label: {regular: "Mi/h", large: "Mi/h"},
	            decimalPlaces: 1
	        },
	        distance: {
	            label: {regular: "Mi", large: "Mi"},
	            decimalPlaces: 2
	        },
	        spm: {
	            label: {regular: "SPM", large: "SPM"},
	            decimalPlaces: 1
	        },
	        efficiency: {
	            label: {regular: "ft", large: "ft"},
	            decimalPlaces: 1
	        },
	        pace: {
	            label: {regular: "Min/Mi", large: "Min/Mi"},
	            round: false
	        }
	    }
	};
	
	
	function Context(settings) {
	    this._settings = settings;
	    this._system = this._settings.isImperial() ? 'imperial' : 'metric';
	}
	
	Context.prototype.preferences = function () {
	    return this._settings;
	};
	
	/**
	 *
	 * @param type
	 * @param large
	 * @returns {*}
	 */
	Context.prototype.getUnit = function (type, large) {
	    var size = large === true ? "large" : "regular";
	
	    return units[this._system][type].label[size];
	};
	
	/**
	 * Should we round this type?
	 * @param type
	 * @returns {boolean}
	 */
	Context.prototype.round = function (type) {
	    return units[this._system][type].round !== false && units[this._system][type].decimalPlaces > 0;
	};
	
	/**
	 *
	 * @param type
	 * @returns {*}
	 */
	Context.prototype.getUnitDecimalPlaces = function (type) {
	    return units[this._system][type].decimalPlaces;
	};
	
	Context.prototype.displayMetric = function (type, value) {
	    if (units[this._system][type] === undefined) {
	        throw 'unkown field type - ' + type;
	    }
	
	    if (isNaN(value)) return 0;
	
	    return utils.round(value, this.getUnitDecimalPlaces(type));
	};
	
	/**
	 * navigate to target
	 * @param target
	 * @param clear
	 * @param args
	 */
	Context.prototype.navigate = function (target, clear, args) {
	    if (target === 'session' && this._settings.isShowTouchGestures()) {
	        target = 'session-basic-touch-tutorial';
	    }
	
	    if (target === 'calibration' && this._settings.isShowCalibrationTips()) {
	        target = 'calibration-help';
	    }
	
	    if (clear === true) App.destroyStack();
	
	    App.load(target, args, undefined, function () {
	        if (clear === true)
	            App.removeFromStack();
	    });
	};
	
	exports.Context = Context;

/***/ }
/******/ ]);
//# sourceMappingURL=app.js.map