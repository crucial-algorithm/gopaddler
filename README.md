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
