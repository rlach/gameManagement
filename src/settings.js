const fs = require('fs');

let settings;

if(!settings) {
    settings = JSON.parse(fs.readFileSync('./settings.json'));
}

module.exports = settings;
