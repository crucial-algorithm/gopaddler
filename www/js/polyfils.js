'use strict';

// Add support for vh and vw units in older browsers (android < 4.4)
new vUnit({
    CSSMap: {
        // Wanted to have a font-size based on the viewport width? You got it.
        '.vw_font-size': {
            property: 'font-size',
            reference: 'vw'
        },
        '.vh_font-size': {
            property: 'font-size',
            reference: 'vh'
        },
        '.vw_width': {
            property: 'width',
            reference: 'vw'
        },
        '.vh_height': {
            property: 'height',
            reference: 'vh'
        },
        '.vh_top': {
            property: 'top',
            reference: 'vh'
        },
        '.vh_bottom': {
            property: 'bottom',
            reference: 'vh'
        },
        '.vw_padding-right': {
            property: 'padding-right',
            reference: 'vh'
        },
        '.vh_padding-top': {
            property: 'padding-top',
            reference: 'vh'
        },
        '.vh_padding-bottom': {
            property: 'padding-bottom',
            reference: 'vh'
        },
        '.vh_line-height': {
            property: 'line-height',
            reference: 'vh'
        },
        '.vh_margin-top': {
            property: 'margin-top',
            reference: 'vh'
        }

    },
    onResize: function() {
        console.log('A screen resize just happened, yo.');
    }
}).init(); // call the public init() method