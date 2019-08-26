const fs = require('fs');
const sample = require('./settings-sample');
const { removeUndefined } = require('./util/objects');

class Settings {
    getSettings() {
        if (!this.settings) {
            this.settings = JSON.parse(JSON.stringify(sample));
            if (fs.existsSync('./settings.json')) {
                const readSettings = JSON.parse(
                    fs.readFileSync('./settings.json').toString()
                );
                Object.assign(this.settings, removeUndefined(readSettings));
            }
        }
        return this.settings;
    }
}

module.exports = new Settings();
