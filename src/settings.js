const fs = require('fs');

let settings;

if(!settings) {
    if(fs.existsSync('./settings.json')) {
        settings = JSON.parse(fs.readFileSync('./settings.json'));
    } else {
        settings = require('./settings-sample');
    }
}

module.exports = settings;
