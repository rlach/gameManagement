const vndb = require('../util/vndb');
const log = require('../util/logger');
const SiteStrategy = require('./siteStrategy');

const VNDB_ID_REGEX = new RegExp(/^v\d+$/gi);

class VndbStrategy extends SiteStrategy {
    constructor(settings) {
        super('vndb', settings);
    }

    async fetchGameData(gameId) {
        const vndbId = Number.parseInt(gameId.replace('v', ''));
        const result = await vndb.getVNById(vndbId);

        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(/v\d+/gi);
        return matches ? matches[0] : '';
    }

    async findGame(name) {
        return vndb.findVNsByName(name);
    }

    async getAdditionalImages(id) {
        const result = await this.fetchGameData(id);
        return result.additionalImages;
    }

    shouldUse(gameId) {
        return !!gameId.match(VNDB_ID_REGEX);
    }
}

module.exports = VndbStrategy;
