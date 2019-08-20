const log = require('../util/logger');
const moment = require('moment');
const html = require('../util/html');
const { parseSite } = require('../util/html');
const { removeUndefined } = require('../util/objects');
const vndb = require('../util/vndb');
const SiteStrategy = require('./siteStrategy');

const GETCHU_ID_REGEX = /\d{6,8}/gi;
const STRATEGY_NAME = 'getchu';

class GetchuStrategy extends SiteStrategy {
    constructor(settings) {
        super(STRATEGY_NAME, settings);
    }

    async fetchGameData(gameId, game) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);

        const sourceMissing = game ? game.sourceMissingJp : undefined;
        const jpnResult = await getJapaneseSite(gameId, sourceMissing);
        const jpn = jpnResult ? jpnResult : {};
        let eng = {};
        let reviews = {};
        if (jpn.nameJp) {
            log.debug(`Getting english site for ${jpn.nameJp}`);
            const engResult = await vndb.getVNByName(jpn.nameJp);
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
        const matches = name.match(/\d{6,}/gi);
        return matches && matches[0].length <= 8 ? matches[0] : '';
    }

    async callFindGame(name) {
        const uri = `http://www.getchu.com/php/search.phtml?search_keyword=${encodeURIComponent(
            name
        )}&list_count=30&sort=sales&sort2=down&search_title=&search_brand=&search_person=&search_jan=&search_isbn=&genre=pc_soft&start_date=&end_date=&age=&list_type=list&gc=gc&search=search`;
        log.debug('Uri called for search', uri);
        return html.callPage(uri);
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
        return result.additionalImages;
    }

    shouldUse(gameId) {
        return !!gameId.match(/^\d{6,8}$/gi);
    }
}

module.exports = GetchuStrategy;

function getGameMetadataJp(query) {
    try {
        let releaseDayText = query('#tooltip-day').text();
        let images = getImages(query);

        return removeUndefined({
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
            imageUrlJp: images.find(image => image.includes('package')),
            additionalImages: images.filter(image => image.includes('sample')),
        });
    } catch (e) {
        log.debug('Metadata parsing failure', e);
    }
}

function getImages(query) {
    return query('a.highslide')
        .filter(
            (i, e) =>
                query(e).attr('href') &&
                (query(e)
                    .attr('href')
                    .includes('sample') ||
                    query(e)
                        .attr('href')
                        .includes('package'))
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
        let reply = await html.callPage(
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
        log.debug(`Error getting ${id} from ${STRATEGY_NAME}`, e);
        return undefined;
    }
}

async function getReviews(id) {
    try {
        let reply = await html.callPage(
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
        log.debug(`Error getting reviews for ${id} from ${STRATEGY_NAME}`);
        return undefined;
    }
}
