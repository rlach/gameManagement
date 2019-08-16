const fs = require('fs');
const SiteStrategy = require('./siteStrategy');

const OTHER_ID_REGEX = new RegExp(/^other\d+$/gi);

class OtherStrategy extends SiteStrategy {
    constructor() {
        super('other');
    }

    async fetchGameData(_a, _b, path) {
        const subdirectory = fs
            .readdirSync(path, { withFileTypes: true })
            .find(dirent => dirent.isDirectory());

        return subdirectory
            ? {
                  nameEn: subdirectory.name,
              }
            : undefined;
    }

    extractCode() {
        return '';
    }

    async findGame() {
        return [];
    }

    async getAdditionalImages() {
        return undefined;
    }

    shouldUse(gameId) {
        return !!gameId.match(OTHER_ID_REGEX);
    }

    scoreCodes() {
        return [];
    }
}

let otherStrategy = new OtherStrategy();
module.exports = otherStrategy;
