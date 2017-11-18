exports.postSpeed = function (payload) {
    $.ajax({
        type: "POST", dataType: "json", data: payload
        , url: "http://audit.gopaddler.com/speed"
    })
};

exports.postException = function (payload) {
    $.ajax({
        type: "POST", dataType: "json", data: payload
        , url: "http://audit.gopaddler.com/exception"
    })
};



