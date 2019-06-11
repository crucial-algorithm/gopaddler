#!/bin/sh
cordova build android --release --storePassword=$ANDROID_KEY_STORE_PASSWORD --password=$ANDROID_KEY_PASSWORD
