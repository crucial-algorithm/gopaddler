module.exports = {
    cordova: {
        id: "com.uttercoach.cycling",
        name: "Utter Cycling",
        description: "Track speed, distance and cadence using Utter Cycling",
        author: "UtterCoach team",
        authorEmail: "filipe@uttercoach.com",
        authorHref: "https://uttercoach.com",
        version: "0.0.1",
        versionCode: "10",
    },
    src: {
        versioning: {
            apiVersion: 2,
            sessionVersion: 5
        },
        endpoints: {
            dev: {
                server: "http://local.gopaddler.com",
                endpoint: "ws://local.gopaddler.com/websocket"
            },
            "remote-dev": {
                server: "https://dev.gopaddler.com",
                endpoint: "wss://dev.gopaddler.com/websocket"
            },
            prod: {
                server: "https://app.uttercoach.com",
                endpoint: "wss://ws.uttercoach.com/websocket"
            }
        },
        distanceStep: 100,
        database: {
            name: 'uttercycling.db',
            location: 2
        },
        sessionType: 'cycling'
    }
}