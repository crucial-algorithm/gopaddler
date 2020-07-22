module.exports = {
    cordova: {
        id: "com.gopaddler.app",
        description: "Track speed, distance and stroke rate using GoPaddler",
        name: "GoPaddler",
        author: "GoPaddler Team",
        authorEmail: "joaquim.rego@gopaddler.com",
        authorHref: "https://gopaddler.com",
        version: "1.6.0",
        versionCode: "1600",
    },
    src: {
        versioning: {
            apiVersion: 2,
            sessionVersion: 5
        },
        endpoints: {
            dev : {
                server: "http://local.gopaddler.com",
                endpoint: "ws://local.gopaddler.com/websocket"
            },
            "remote-dev": {
                server: "https://dev.gopaddler.com",
                endpoint: "wss://dev.gopaddler.com/websocket"
            },
            prod: {
                server: "https://app.gopaddler.com",
                endpoint: "wss://app.gopaddler.com/websocket"
            }
        },
        distanceStep: 10,
        database: {
            name: 'sessions.db',
            location: 2
        },
        sessionType: 'canoeing'
    }
}