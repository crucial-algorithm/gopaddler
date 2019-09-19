'use strict';


class IO {
    static open(filename) {
        const defer = $.Deferred();

        if (!filename) {
            defer.reject();
            return defer.promise();
        }

        console.debug('open ', filename);

        const success = function (dir) {
            dir.getFile(filename, {create: true}, function (file) {
                defer.resolve(file)
            });
        };

        if (window.resolveLocalFileSystemURL)
            window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, success, function fail(e) {
                defer.reject(e);
            });

        return defer.promise();
    }

    static write(file, content) {
        if (!file) return;

        file.createWriter(function (fileWriter) {

            fileWriter.seek(fileWriter.length);
            const blob = new Blob([content], {type: 'text/plain'});
            fileWriter.write(blob);

        }, function fail() {
            console.log("write to log failed");
        });
    }

    static read(file) {
        const defer = $.Deferred();
        file.file(function (file) {
            const reader = new FileReader();

            reader.onloadend = function (e) {
                console.log("reading from: ", this);
                defer.resolve(this.result);
            };

            reader.readAsText(file);
        });

        return defer.promise();
    }
}


export default IO;