
var template = require('./choose.boat.art.html');

function ChooseBoatView(page, context) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
}

exports.ChooseBoatView = ChooseBoatView;
