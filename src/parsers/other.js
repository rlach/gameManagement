const fs = require('fs');
const SiteStrategy = require('./siteStrategy');

const OTHER_ID_REGEX = new RegExp(/^other\d+$/gi);

class OtherStrategy extends SiteStrategy {
    constructor() {
        super('other');
    }

    async fetchGameData(_a, _b, path) {
        const subdirectories = fs
            .readdirSync(path, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        if (subdirectories.length > 0) {
            return {
                nameEn: subdirectories[0],
            };
        }
    }

    extractCode(name) {
        return [];
    }

    async findGame() {
        return [];
    }

    async getAdditionalImages() {
        return undefined;
    }

    shouldUse(gameId) {
        return gameId.match(OTHER_ID_REGEX);
    }
}

let otherStrategy = new OtherStrategy();
module.exports = otherStrategy;
