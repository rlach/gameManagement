const fs = require('fs');

let settings;

if (!settings) {
    settings = require('./settings-sample');
    if (fs.existsSync('./settings.json')) {
        const readSettings = JSON.parse(
            fs.readFileSync('./settings.json').toString()
        );
        Object.assign(settings, readSettings);
    }
}

module.exports = settings;
