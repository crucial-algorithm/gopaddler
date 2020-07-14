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
       distanceStep: 100,
        database: {
            name: 'uttercycling.db',
            location: 2
        },
        sessionType: 'cycling'
    }
}