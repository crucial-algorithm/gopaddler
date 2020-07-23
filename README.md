# README #

GoPaddler mobile app

### How do I get set up? ###

#### Clone this repository
    > git clone https://kimile@bitbucket.org/kimile/paddler-app.git
    
#### Build source code
    Build once
    > webpack
    watch mode
    > webpack --progress --colors --watch
    
#### To deploy in mobile        

##### Install npm dependencies   
    > npm install plist

##### Prepare cordova environment
    > cordova prepare

##### Try it
    > cordova run android

#### To develop in your browser
    > npm install zerver
    > zerver wwww
    Open your browser in http://localhost:5000
    Open developer tools and enable device mode; Last, set User Agent (in Network Conditions) to custom value "GoPaddler-DEV"
    

#### For Unit testing
Test cases are stored in local PostgreSQL database

##### Requirements
    > sudo npm install -g mocha
    > npm install pg
    > npm install bluebird

##### Running
    > cd src/test/js
    > mocha .

### How do I do a release ###

#### Android
   > cordova build android --release

### Frequent Issues ###
#### Lock orientation not working in IOS
Make sure that plist hook is defining the accepted view modes:
```
    obj.UISupportedInterfaceOrientations = [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeRight"
    ];
    obj["UISupportedInterfaceOrientations~ipad"] = [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeRight"
    ];
```
If truly desperate, edit ./platforms/ios/CordovaLib/Classes/Public/CDVViewController.m to the following:

```
- (BOOL)shouldAutorotate
{
    return FALSE;
}
```

#### Multiple MissingDefaultResource errors
If multiple errors occur stating MissingDefaultResource where generating --release version, just like the one bellow,
```
> Task :app:lintVitalRelease
/Users/kimile/gopaddler/workspace/app/platforms/android/app/src/main/res/drawable-land-hdpi/screen.png: Error: The drawable "screen" in drawable-land-hdpi has no declaration in the base drawable folder or in a drawable-densitydpi folder; this can lead to crashes when the drawable is queried in a configuration that does not match this qualifier [MissingDefaultResource]
```
follow these instructions:
1. Create a folder called drawable at <project>/platforms/android/app/src/main/res/
2. Copy screen.png to that folder (use larger image)
3. Run cordova again

#### Duplicate PermissionHelper.java and BuildHelper.java
These files were included into android platform starting in version 6.x; Just remove duplicate files:
```
rm ./app/src/main/java/org/apache/cordova/PermissionHelper.java
rm ./app/src/main/java/org/apache/cordova/BuildHelper.java
```
If it does not work, try removing compat and adding again (version 1.2):
```
cordova plugin rm cordova-plugin-compat --force
cordova plugin add cordova-plugin-compat@1.2
```

### Generating splash screen
#### Install
Follow instruction @ https://github.com/AlexDisler/cordova-splash
Note: requires brew install ImageMagic

cordova-splash --splash=./res/splash.png

### Troubleshooting
#### App hanging before creating database schema
Probably missing plugin:
cordova plugin add cordova-sqlite-storage



#### org.gradle.api.file.ProjectLayout.directoryProperty(Lorg/gradle/api/provider/Provider;)Lorg/gradle/api/file/DirectoryProperty;
- Edit platforms/android/build.gradle
- Change classpath version from classpath 'com.android.tools.build:gradle:3.3.0' -> classpath 'com.android.tools.build:gradle:4.0.0'
