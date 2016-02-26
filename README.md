# Paddler Cordova App
Some basic documentation on how to use this project to compile and deploy the mobile app


## Setup cordova
cordova create paddler com.paddlermetrics.paddler Paddler
cordova platforms add android
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-console
cordova plugin add cordova-plugin-dialogs
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-device-motion
cordova plugin add cordova-plugin-screen-orientation
cordova plugin add cordova-plugin-powermanagement
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-ios-longpress-fix
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-google-analytics
cordova plugin add cordova-plugin-splashscreen

cordova plugin add cordova-sqlite-storage
cordova plugin add https://github.com/Wizcorp/phonegap-facebook-plugin.git --variable APP_ID=529853143847598 --variable APP_NAME=GoPaddler

## Compile javascript
### Install webpack
npm install webpack -g

### Compile once
In <app>/, run *webpack*


### Compile automatically
*webpack --progress --colors --watch*



## Unit testing
Test cases are stored in local PostgreSQL databaes

### Requirements
mocha: sudo npm install -g mocha
pg: npm install pg
bluebird: npm install bluebird

### running
cd src/test/js
mocha .
