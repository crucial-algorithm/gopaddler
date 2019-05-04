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

            fileWriter.seek(fileWriter.length);
            var blob = new Blob([content], {type: 'text/plain'});
            fileWriter.write(blob);

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