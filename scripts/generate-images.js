#!/usr/bin/env node
const fs = require('fs');
const gm = require('gm').subClass({imageMagick: true});

// script requires a .app file to be present in the root folder and for it to contain the app name we are generating for

// this is what get's executed!
(async function run() {
    await generateAndroid();
    await generateiOS();
})()

const androidSplashImages = [ null
    , {width:  800, height:  480,  file: 'platforms/android/app/src/main/res/drawable-land-hdpi/screen.png' }
    , {width:  320, height:  200,  file: 'platforms/android/app/src/main/res/drawable-land-ldpi/screen.png' }
    , {width:  480, height:  320,  file: 'platforms/android/app/src/main/res/drawable-land-mdpi/screen.png' }
    , {width: 1280, height:  720,  file: 'platforms/android/app/src/main/res/drawable-land-xhdpi/screen.png' }
    , {width: 1600, height:  960,  file: 'platforms/android/app/src/main/res/drawable-land-xxhdpi/screen.png' }
    , {width: 1920, height: 1280,  file: 'platforms/android/app/src/main/res/drawable-land-xxxhdpi/screen.png' }
    , {width:  480, height:  800,  file: 'platforms/android/app/src/main/res/drawable-port-hdpi/screen.png' }
    , {width:  200, height:  320,  file: 'platforms/android/app/src/main/res/drawable-port-ldpi/screen.png' }
    , {width:  320, height:  480,  file: 'platforms/android/app/src/main/res/drawable-port-mdpi/screen.png' }
    , {width:  720, height: 1280,  file: 'platforms/android/app/src/main/res/drawable-port-xhdpi/screen.png' }
    , {width:  960, height: 1600,  file: 'platforms/android/app/src/main/res/drawable-port-xxhdpi/screen.png' }
    , {width: 1280, height: 1920,  file: 'platforms/android/app/src/main/res/drawable-port-xxxhdpi/screen.png' }
];


const androidIconImagesForeground = [ null
    , {width:   36, height:   36,  file: 'platforms/android/app/src/main/res/mipmap-ldpi/ic_launcher.png', source: './res/{{app}}/icon.png'}
    , {width:   72, height:   72,  file: 'platforms/android/app/src/main/res/mipmap-hdpi-v26/ic_launcher_foreground.png' }
    , {width:   36, height:   36,  file: 'platforms/android/app/src/main/res/mipmap-ldpi-v26/ic_launcher_foreground.png' }
    , {width:   48, height:   48,  file: 'platforms/android/app/src/main/res/mipmap-mdpi-v26/ic_launcher_foreground.png' }
    , {width:  216, height:  216,  file: 'platforms/android/app/src/main/res/mipmap-xhdpi-v26/ic_launcher_foreground.png' }
    , {width:  324, height:  324,  file: 'platforms/android/app/src/main/res/mipmap-xxhdpi-v26/ic_launcher_foreground.png' }
    , {width:  432, height:  432,  file: 'platforms/android/app/src/main/res/mipmap-xxxhdpi-v26/ic_launcher_foreground.png' }
];

const androidIconImagesBackground = [ null
    , {width:   72, height:   72,  file: 'platforms/android/app/src/main/res/mipmap-hdpi-v26/ic_launcher_background.png' }
    , {width:   36, height:   36,  file: 'platforms/android/app/src/main/res/mipmap-ldpi-v26/ic_launcher_background.png' }
    , {width:   48, height:   48,  file: 'platforms/android/app/src/main/res/mipmap-mdpi-v26/ic_launcher_background.png' }
    , {width:  216, height:  216,  file: 'platforms/android/app/src/main/res/mipmap-xhdpi-v26/ic_launcher_background.png' }
    , {width:  324, height:  324,  file: 'platforms/android/app/src/main/res/mipmap-xxhdpi-v26/ic_launcher_background.png' }
    , {width:  432, height:  432,  file: 'platforms/android/app/src/main/res/mipmap-xxxhdpi-v26/ic_launcher_background.png' }
];

const iOSSplashImages = [ null
    , { width: 1242, height: 2688, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/1242x2688.png' }
    , { width: 2688, height: 1242, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/2688x1242.png' }
    , { width:  828, height: 1792, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/828x1792.png' }
    , { width: 1792, height:  828, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/1792x828.png' }
    , { width:  768, height: 1004, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/768x1004.png' }
    , { width: 1536, height: 2008, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/1536x2008.png' }
    , { width: 1024, height:  748, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/1024x748.png' }
    , { width: 2048, height: 1496, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/2048x1496.png' }
    , { width: 1125, height: 2436, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-2436h.png' }
    , { width:  640, height: 1136, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-568h@2x~iphone.png' }
    , { width:  750, height: 1334, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-667h.png' }
    , { width: 1242, height: 2208, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-736h.png' }
    , { width: 2436, height: 1125, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Landscape-2436h.png' }
    , { width: 2208, height: 1242, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Landscape-736h.png' }
    , { width: 2048, height: 1536, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Landscape@2x~ipad.png' }
    , { width: 1024, height:  768, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Landscape~ipad.png' }
    , { width: 1536, height: 2048, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Portrait@2x~ipad.png' }
    , { width:  768, height: 1024, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default-Portrait~ipad.png' }
    , { width:  640, height:  960, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default@2x~iphone.png' }
    , { width:  320, height:  480, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/LaunchImage.launchimage/Default~iphone.png' }
];

const iOSIconImages = [ null
    , { width:  216, height:  216, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-216.png' }
    , { width: 1024, height: 1024, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-1024.png' }
    , { width:   20, height:   20, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-20.png' }
    , { width:   40, height:   40, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-20@2x.png' }
    , { width:   60, height:   60, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-20@3x.png' }
    , { width:   48, height:   48, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-24@2x.png' }
    , { width:   55, height:   55, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-27.5@2x.png' }
    , { width:   29, height:   29, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-29.png' }
    , { width:   58, height:   58, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-29@2x.png' }
    , { width:   87, height:   87, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-29@3x.png' }
    , { width:   40, height:   40, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-40.png' }
    , { width:   80, height:   80, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-40@2x.png' }
    , { width:   88, height:   88, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-44@2x.png' }
    , { width:   50, height:   50, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-50.png' }
    , { width:  100, height:  100, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-50@2x.png' }
    , { width:  120, height:  120, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-60@2x.png' }
    , { width:  180, height:  180, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-60@3x.png' }
    , { width:   72, height:   72, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-72.png' }
    , { width:  144, height:  144, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-72@2x.png' }
    , { width:   76, height:   76, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-76.png' }
    , { width:  152, height:  152, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-76@2x.png' }
    , { width:  167, height:  167, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-83.5@2x.png' }
    , { width:  172, height:  172, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-86@2x.png' }
    , { width:  196, height:  196, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon-98@2x.png' }
    , { width:   57, height:   57, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon.png' }
    , { width:  114, height:  114, file: 'platforms/ios/{{ios_project_folder}}/Images.xcassets/AppIcon.appiconset/icon@2x.png' }
];

/**
 *
 * @return {Promise<unknown>}
 */
function generateAndroid() {
    return new Promise((resolve) => {
        getAppImages().then(async (images) => {

            console.log('\n\nGenerating android splash screen images')
            await generate(androidSplashImages, images.splash);
            console.log('\n\nGenerating android icon images')

            console.log('*****************************************************************************************************************************************************');
            console.log('** Android icons cannot be generated programmatically!!! Use Image Asset Studio to generate images (available in Android Studio > Resource Manager **');
            console.log('*****************************************************************************************************************************************************\n\n');

            await generate(androidIconImagesForeground, images.foreground, null, images.app);
            await generate(androidIconImagesBackground, images.background, null, images.app);
            console.log('\n\n --> Android image generation complete <-- \n')
            resolve();
        }).catch((err) => {
            if (err.code === 'ENOENT') {
                console.log('missing .app file: create .app file in root dir with the name of the app this project folder is target at');
                process.exit(0);
            } else {
                console.error(err);
                process.exit(1);
            }
        });
    });
}

/**
 *
 * @return {Promise<unknown>}
 */
function generateiOS() {
    return new Promise((resolve) => {
        getAppImages().then(async (images) => {
            let iosProjectFolder = null;
            if (images.app === 'gopaddler') {
                iosProjectFolder = 'GoPaddler';
            } else {
                iosProjectFolder = 'Utter Cycling';
            }

//            console.log('Generating ios splash screen images')
//            await generate(iOSSplashImages, images.splash, iosProjectFolder);
            console.log('\n\nGenerating ios icon images')
            await generate(iOSIconImages, images.icon, iosProjectFolder);
            console.log('\n\n --> iOS image generation complete <-- \n')
            resolve();
        }).catch((err) => {
            if (err.code === 'ENOENT') {
                console.log('missing .app file: create .app file in root dir with the name of the app this project folder is target at');
                process.exit(0);
            } else {
                console.error(err);
                process.exit(1);
            }
        });
    });
}

/**
 *
 * @param {Array<null|{width: number, height: number, file: string, [source]: string}>} sizes  List of image sizes we want to generate
 * @param {string}      image                Image path
 * @param {string|null} iosProjectFolder     ios project folder name
 * @param {string|null} app                  app name for replace in case of override of image in setting
 * @return {Promise<>}
 */
function generate(sizes, image, iosProjectFolder= null, app = null) {
    return new Promise((resolve) => {
        (function loop(sizes) {
            if (sizes.length === 0) return resolve();
            let config = sizes.pop();
            if (config === null) return loop(sizes);
            let filename = config.file;
            if (iosProjectFolder !== null) filename = filename.replace('{{ios_project_folder}}', iosProjectFolder);
            if (config.source) {
                image = config.source.replace('{{app}}', app);
            }
            generateImage(image, config.width, config.height, filename).finally(() => {
                loop(sizes);
            });
        })(sizes);
    });
}

/**
 * Get images path for app we are currently building for
 * @return {Promise<{splash: string, icon: string, app: string, background: string, foreground: string}>}
 */
function getAppImages() {
    return new Promise((resolve, reject) => {
        fs.readFile('.app', 'utf8', function (err, app) {
            if (err) {
                reject(err);
                return;
            }
            app = app.trimEnd();
            resolve({splash: `./res/${app}/splash.png`
                , icon: `./res/${app}/icon.png`
                , background: `./res/${app}/icon-background.png`
                , foreground: `./res/${app}/icon-foreground.png`
                , app: app})
        });
    });
}

/**
 *
 * @param {string} imagePath    Source file name
 * @param {number} width        Target width
 * @param {number} height       Target height
 * @param {string} output       target file name
 * @return {Promise}
 */
function generateImage(imagePath, width, height, output) {
    return new Promise((resolve) => {
        let image = gm(imagePath);
        determineImageSize(image, width, height, output).then(resize).then(crop).then(() => {
            resolve();
        }).catch((err) => {
            console.error(err);
            resolve(err);
        })
    });
}

/**
 * Calculate image size and pass that with all the required info to the resize function
 *
 * @param image
 * @param width
 * @param height
 * @param output
 * @return {Promise<{image: gm, width: number, target: {width: number, height: number, file: string}}>}
 */
function determineImageSize(image, width, height, output) {
    return new Promise((resolve, reject) => {
        image.size((err, value) => {
            if (err) {
                reject(err);
            } else {
                resolve({image: image, width: value.width, target: {width: width, height: height, file: output}});
            }
        });
    });
}

/**
 *
 * @param {{image: gm, width: number, target: {width: number, height: number, file: string}}} options
 * @return {Promise<{source: string, output: string, width: number, height: number}>}
 */
function resize(options) {
    return new Promise((resolve, reject) => {
        // calculate image size
        let x = Math.floor(options.width / (options.target.width * .33));
        image = options.image.gravity('Center');
        let newWidthHeight = Math.max(Math.floor((options.width / x) / 0.33), Math.max(options.target.width, options.target.height));
        let filename = `.inter@${options.target.width}x${options.target.height}.png`;
        options.image.resize(newWidthHeight, newWidthHeight).write(filename, function (err) {
            if (err) {
                reject(err)
            } else {
                resolve({output: options.target.file, source: filename, width: options.target.width, height: options.target.height})
            }
        });
    })
}

/**
 *
 * @param {{source: string, output: string, width: number, height: number}} options
 * @return {Promise<string>}
 */
function crop(options) {
    return new Promise((resolve, reject) => {
        gm(options.source).gravity('Center')
            .crop(options.width, options.height, 0, 0, null).write(options.output, function (err) {
            if (err) {
                reject(err);
            } else {
                console.log(`Created ${options.width}x${options.height} @ ${options.output}`);
                fs.unlinkSync(options.source);
                resolve();
            }
        });
    });
}