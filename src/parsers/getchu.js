const log = require('./../logger');
const moment = require('moment');
const { callPage } = require('../html');
const { parseSite } = require('../html');
const { removeUndefined } = require('../util/objects');
const { getVndbData } = require('../vndb');
const SiteStrategy = require('./siteStrategy');

const GETCHU_ID_REGEX = /\d{6,8}/gi;

class GetchuStrategy extends SiteStrategy {
    constructor() {
        super('getchu');
    }

    async fetchGameData(gameId, game) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);

        const jpnResult = await getJapaneseSite(gameId, game.sourceMissingJp);
        const jpn = jpnResult ? jpnResult : {};
        let eng = {};
        let reviews = {};
        if (jpn.name) {
            log.debug(`Getting english site for ${jpn.name}`);
            const engResult = await getVndbData(jpn.name);
            if (engResult) {
                eng = engResult;
            }

            reviews = await getReviews(gameId);
        }

        const result = {};
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        Object.assign(result, removeUndefined(reviews));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(GETCHU_ID_REGEX);
        return matches ? matches[0] : '';
    }

    async callFindGame(name) {
        const uri = `http://www.getchu.com/php/search.phtml?search_keyword=${encodeURIComponent(
            name
        )}&list_count=30&sort=sales&sort2=down&search_title=&search_brand=&search_person=&search_jan=&search_isbn=&genre=pc_soft&start_date=&end_date=&age=&list_type=list&gc=gc&search=search`;
        log.debug('Uri called for search', uri);
        return callPage(uri);
    }

    async findGame(name) {
        const reply = await this.callFindGame(name);
        const query = parseSite(reply);
        return query('.blueb')
            .map((i, e) => ({
                workno:
                    query(e).attr('href') &&
                    query(e)
                        .attr('href')
                        .match(GETCHU_ID_REGEX)
                        ? query(e)
                              .attr('href')
                              .match(GETCHU_ID_REGEX)[0]
                        : undefined,
                work_name: query(e)
                    .text()
                    .trim(),
            }))
            .get()
            .filter(b => b.workno);
    }

    async getAdditionalImages(id) {
        const result = await getJapaneseSite(id);
        return result ? result.additionalImages : undefined;
    }

    shouldUse(gameId) {
        return gameId.match(GETCHU_ID_REGEX);
    }
}

let getchuStrategy = new GetchuStrategy();
module.exports = getchuStrategy;

function getGameMetadataJp(query) {
    try {
        let releaseDayText = query('#tooltip-day').text();

        return {
            nameJp: query('#soft-title')
                .children()
                .remove()
                .end()
                .text()
                .trim(),
            releaseDate: releaseDayText
                ? moment(releaseDayText, 'YYYY/MM/DD').format()
                : undefined,
            descriptionJp: query('.tablebody')
                .text()
                .trim(),
            makerJp: query('.glance').text(),
            imageUrlJp: query('.highslide img')
                .attr('src')
                .replace('./', 'http://getchu.com/'),
            additionalImages: getAdditionalImages(query),
        };
    } catch (e) {
        log.debug('Metadata parsing failure', e);
    }
}

function getAdditionalImages(query) {
    return query('a.highslide')
        .filter((i, e) =>
            query(e)
                .attr('href')
                .includes('sample')
        )
        .map((i, e) =>
            query(e)
                .attr('href')
                .startsWith('./')
                ? query(e)
                      .attr('href')
                      .replace('./', 'http://getchu.com/')
                : query(e)
                      .attr('href')
                      .replace('/', 'http://getchu.com/')
        )
        .get();
}

async function getJapaneseSite(id, missingSource) {
    if (missingSource) {
        return undefined;
    }
    try {
        let reply = await callPage(
            `http://www.getchu.com/soft.phtml?id=${encodeURIComponent(
                id
            )}&gc=gc`
        );
        if (reply.trim().length === 0) {
            // Getchu returns 200 with empty response when id is wrong
            return {
                sourceMissingJp: true,
            };
        }
        const root = parseSite(reply);
        return getGameMetadataJp(root);
    } catch (e) {
        log.debug(`Error getting ${id} from ${getchuStrategy.name}`, e);
        return undefined;
    }
}

async function getReviews(id) {
    try {
        let reply = await callPage(
            `http://www.getchu.com/review/item_review.php?action=list&id=${encodeURIComponent(
                id
            )}`
        );
        const query = parseSite(reply);

        let averageRatingText = query('.r_ave').text();

        averageRatingText = averageRatingText ? averageRatingText : '0.00';

        return {
            communityStars: Number.parseFloat(
                averageRatingText.match(/\d\.\d\d/)[0]
            ),
        };
    } catch (e) {
        log.debug(
            `Error getting reviews for ${id} from ${getchuStrategy.name}`
        );
        return undefined;
    }
}
