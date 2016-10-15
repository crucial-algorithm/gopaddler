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