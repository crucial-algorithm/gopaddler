// Converts from degrees to radians.
Math.toRadians = function(degrees) {
    return degrees * Math.PI / 180;
};

Math.round2 = function(value) {
    return Math.round(value * 100) / 100;
};


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
}


Array.prototype.indexOf = function (value) {
    if (this.length === 0) return -1;

    for (var i = 0; i < this.length; i++) {
        if (this[i] === value) {
            return i;
        }
    }
    return -1;
}

/**
 * remove from beginning
 * @param milis
 */
Array.prototype.after = function (milis) {
    if (this.length == 0)
        return [];

    var first = this[0].getSampleAt();
    for (var i = 0; i < this.length; i++) {

        if (this[i].getSampleAt() > first + milis)
            break;
    }
    return this.slice(i, this.length);
}

/**
 * Remove from end
 *
 * @param milis
 * @returns {Array}
 */
Array.prototype.before = function(milis) {
    if (this.length == 0)
        return [];
    var last = this[this.length - 1].getSampleAt();
    for (var i = (this.length - 1); i >= 0; i--) {

        if (this[i].getSampleAt() < last - milis)
            break;
    }
    return this.slice(0, i);
};




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
        if (sql.toLowerCase().substr(0,3) === 'ins') {
            success({insertId: 1234});
        } else {
            var data = [
                {id: 1, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 2, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 3, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 4, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 5, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 6, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 7, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 8, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 9, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 10, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 11, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 12, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 13, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 14, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0}
            ];
            success({rows: {length: 14, item: function (index) {
                return data[index];
            }}})
        }
    };

    window.sqlitePlugin.openDatabase = function (args) {
        return {
            executeSql: executeSql,
            transaction: function(callback) {
                setTimeout(function () {
                    callback({executeSql: executeSql});
                }, 0);
            }
        }
    }
}


$.extend($.fn,{
    createBtn: function () {
        var elmWidth = $("li", $(this)).width(),
            listType = false,
            btnWidth = elmWidth < 300 && listType ? "35%" : elmWidth > 300 && !listType ? "25%" : "20%";
        $("li", $(this)).on("swipeLeft swipeRight vclick tap", function (e) {
            $(this).revealBtn(e, btnWidth);
        }).on('swipe', function(){
                console.log('swipping');
            });
    },
    revealBtn: function (e, x) {
        var self = this;
        var check = this.check(x),
            swipe = e.type;
        if (check == "closed") {
            swipe == "swipeRight" ? this.open(e, x, "left") : swipe == "swipeLeft" ? this.open(e, x, "right") : setTimeout(function () {
                self.close(e);
            }, 0);
            e.stopImmediatePropagation();
        }
        if (check == "right" || check == "left") {
            swipe == "swipeRight" ? this.open(e, "left") : swipe == "swipeLeft" ? this.open(e, x, "right") : setTimeout(function () {
                self.close(e);
            }, 0);
            e.stopImmediatePropagation();
        }
        if (check !== "closed" && e.isImmediatePropagationStopped() && (swipe == "vclick" || swipe == "tap")) {
            self.close(e);
        }
    },
    close: function (e) {
        var check = this.check();
        this.css({
            transform: "translateX(0)"
        });
    },
    open: function (e, x, dir) {
        var posX = dir == "left" ? x : "-" + x;
        $(this).css({
            transform: "translateX(" + posX + ")"
        });
    },
    check: function (x) {
        var matrix = this.css("transform").split(" "),
            posY = parseInt(matrix[matrix.length - 2], 10),
            btnW = (this.width() * parseInt(x) / 100) / 1.1;
        return isNaN(posY) ? "closed" : posY >= btnW ? "left" : posY <= "-" + btnW ? "right" : "closed";
    }
});


$.extend($.fn, {
    hover: function(){}
});


function lpad(value, places) {
    var pad = new Array(places + 1).join('0');
    var str = value + "";
    return pad.substring(0, pad.length - str.length) + str;
}


var IO = {
    open: function(filename) {
        var self = this, defer = $.Deferred();

        console.log('open ', filename);

        var success = function (dir) {
            dir.getFile(filename, {create: true}, function (file) {
                defer.resolve(file)
            });
        };

        if (window.resolveLocalFileSystemURL)
            window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, success, function fail(e) {
                defer.fail(e);
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
}