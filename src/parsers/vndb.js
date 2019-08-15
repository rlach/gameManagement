const { getVndbDataById, findVndbGames } = require('../vndb');
const log = require('./../logger');
const SiteStrategy = require('./siteStrategy');

const VNDB_ID_REGEX = new RegExp(/^v\d+$/gi);

class VndbStrategy extends SiteStrategy {
    constructor() {
        super('vndb');
    }

    async fetchGameData(gameId, game) {
        const vndbId = Number.parseInt(gameId.replace('v', ''));
        const result = await getVndbDataById(vndbId);

        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(VNDB_ID_REGEX);
        return matches ? matches[0] : '';
    }

    async findGame(name) {
        return findVndbGames(name);
    }

    async getAdditionalImages(id) {
        const result = await this.fetchGameData(id);
        return result ? result.additionalImages : undefined;
    }

    shouldUse(gameId) {
        return gameId.match(VNDB_ID_REGEX);
    }
}

let vndbStrategy = new VndbStrategy();
module.exports = vndbStrategy;
