function pdOnDeviceReady(successCallback, failureCallback, interval) {
    if (document.pd_device_ready) {
        clearInterval(interval);
        successCallback.apply(undefined, []);
        return;
    }
    if (interval === undefined) {
        interval = setInterval(function () {
            pdOnDeviceReady(successCallback, failureCallback, interval);
        }, 1000);

        document['retries_' + interval] = 0;

    }

    if (document['retries_' + interval] >= 10) {
        // give up... we are probably in developer mode
        clearInterval(interval);

        if ($.isFunction(failureCallback))
            failureCallback.apply(undefined, []);


        // clean up
        delete document['retries_' + interval];
        return;
    }

    document['retries_' + interval]++;
}