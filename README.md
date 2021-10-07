# README #

GoPaddler mobile app instructions


### Setup project locally  ###
    > git clone https://kimile@bitbucket.org/kimile/paddler-app.git
    > npm install
    > cordova platform add android
    > cordova platform add ios
    > echo '<appname[gopaddler|uttercycling]>' > .app
    > cordova plugin rm @mauron85/cordova-plugin-background-geolocation
    > node scripts/generate-config-for-app.js <gopaddler|uttercycling>
    > cordova plugin add @mauron85/cordova-plugin-background-geolocation
    > node scripts/generate-images.js
    > npm run build:dev [build:dev-remote-portrait|...]
    > cordova run android
    > Open android studio, but don't upgrade gradle version (unless cordova upgrades to gradle 7)

### Development process ###
    Build (watch for changes)
    > npm run build:dev [build:dev-remote-portrait|...]
    Test in browser (by default, localhost:5000, user-agent: gp-dev-ck)
    > npm run www
    
### Running in device ##
    After doing the 1st step (cloning and running using _cordova run android_, open the project in Android Studio and manage execution from there).


### Generate icons in Android ###
    Use Resource Manager > + > Image Asset;
    - Foreground Layer: Choose file from res/<app>/icon-foreground.png
    - Background Layer: Choose color #df4750

### Updating iOS/Android platform  ###
    Updating requires removing and adding platform again
    > cordova platform remove android|ios
    Generate splash/icon images for the platform
    > npm run build:generate-images
    
    Open XCode/Android studio and confirm that images have been properly generated
        iOS: "Utter Cycling" > Resources > Images.xcassets > AppIcon | LaunchStoryBoard
        Android: Resource Manager > Mim Map (icon) | Drawable (splash)        

### Release  ###
    Follow instructions on https://docs.google.com/spreadsheets/d/1ToKXbZJ-MfA47lgWT1xJlJshxDF8Np9Et8NNpjO1ddU/edit#gid=2058990100

### Tagging Releases ###
    Gopaddler tags up to 1.6.0 use just the version numbers; From 1.6.0 onwoards, use gp<a|i>-<build-number> instead (a = android, i = iOS); Example: gpa-1700 for GoPaddler android version 1.7.0

    Uttercycling used cycling-<version> until version 0.9.0; After that, use uc<a|i>-<build-number>; Example: uca-1000 for Utter Cycling Android version 1.0.0; 

### Replace app images  ###
    Images are stored in res/{app-name}/[icon|splash].png. For iOS, splash must be available with the name Default@2x~universal~anyany.png
    Replacing iOS splash image requires removing and adding the platform

### For Unit testing
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

### Troubleshooting
#### App hanging before creating database schema
Probably missing plugin:
cordova plugin add cordova-sqlite-storage



#### org.gradle.api.file.ProjectLayout.directoryProperty(Lorg/gradle/api/provider/Provider;)Lorg/gradle/api/file/DirectoryProperty;
- Edit platforms/android/build.gradle
- Change classpath version from classpath 'com.android.tools.build:gradle:3.3.0' -> classpath 'com.android.tools.build:gradle:4.0.0'
