module.exports = {
    cordova: {
        id: "com.gopaddler.app",
        description: "Track speed, distance and stroke rate using GoPaddler",
        name: "GoPaddler",
        author: "GoPaddler Team",
        authorEmail: "joaquim.rego@gopaddler.com",
        authorHref: "https://gopaddler.com",
        version: "1.7.3",
        versionCode: "1730", // latest version was released with this code but 1723 (changed directly in Android Studio)
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
                server: "https://dev.uttercoach.com",
                endpoint: "wss://dev.uttercoach.com/websocket"
            },
            prod: {
                server: "https://app.uttercoach.com",
                endpoint: "wss://app.uttercoach.com/websocket"
            }
        },
        distanceStep: 10,
        database: {
            name: 'sessions.db'
        },
        sessionType: 'canoeing'
    }
}
