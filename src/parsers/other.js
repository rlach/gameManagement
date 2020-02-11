const SiteStrategy = require('./siteStrategy');
const { removeTagsAndMetadata } = require('../util/files');

const OTHER_ID_REGEX = new RegExp(/^other\d+$/gi);

class OtherStrategy extends SiteStrategy {
    constructor(settings) {
        super('other', settings);
    }

    async fetchGameData(_a, _b, path) {
        const name = path
            .replace(/\\/g, '/')
            .split('/')
            .pop();

        return {
            nameEn: removeTagsAndMetadata(name),
        };
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

module.exports = OtherStrategy;
