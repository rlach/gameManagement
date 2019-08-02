const select = require('soupselect').select;
const log = require('./../logger');
const moment = require('moment');
const { callPage } = require('../html');
const { parseSite } = require('../html');
const { removeUndefined } = require('../objects');
const { getVndbData } = require('./vndb');

const GETCHU_ID_REGEX = /\d{6,8}/gi;

class GetchuStrategy {
    constructor() {
        this.name = 'getchu';
    }

    async fetchGameData(gameId) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);

        const jpnResult = await getJapaneseSite(gameId);
        const jpn = jpnResult ? jpnResult : {};
        let eng = {};
        if (jpn.name) {
            log.debug(`Getting english site for ${jpn.name}`);
            const engResult = await getVndbData(jpn.name);
            if (engResult) {
                eng = engResult;
            }
        }

        const reviews = await getReviews(gameId);

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
        return callPage(
            `http://www.getchu.com/php/search.phtml?search_keyword=${encodeURIComponent(
                name
            )}&list_count=30&sort=sales&sort2=down&search_title=&search_brand=&search_person=&search_jan=&search_isbn=&genre=pc_soft&start_date=&end_date=&age=&list_type=list&gc=gc&search=search`
        );
    }

    async findGame(name) {
        const reply = await this.callFindGame(name);
        const root = parseSite(reply);
        const works = select(root, '.blueb')
            .filter(b => b.name === 'A')
            .map(b => {
                return {
                    work_name: b.children && b.children[0] ? b.children[0].data : '',
                    workno: b.attribs && b.attribs.HREF ? b.attribs.HREF.match(GETCHU_ID_REGEX) : ''
                };
            });

        return { works };
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

function getGameMetadataJp(root) {
    try {
        const titleElement = select(root, '#soft-title').shift();
        const makerElement = select(root, '.glance').shift();
        const imageElement = select(root, '.highslide').shift();
        const description = select(root, '.tablebody');
        let releaseDayText;
        try {
            releaseDayText = select(root, '#tooltip-day').shift().children[0].data;
        } catch (e) {
            log.debug('Release day element missing or invalid');
        }

        return {
            nameJp: titleElement && titleElement.children[0] ? titleElement.children[0].data.trim() : '',
            releaseDate: releaseDayText ? moment(releaseDayText, 'YYYY/MM/DD').format() : undefined,
            descriptionJp: description
                .map(desc => desc.children.map(descChild => (descChild.type === 'text' ? descChild.data : '')))
                .join('\n'),
            makerJp: makerElement && makerElement.attribs ? makerElement.attribs.title.trim() : '',
            imageUrlJp:
                imageElement && imageElement.attribs
                    ? imageElement.attribs.href.replace('.', 'http://www.getchu.com')
                    : '',
            additionalImages: getAdditionalImages(root)
        };
    } catch (e) {
        log.debug('Metadata parsing failure', { e, root });
    }
}

function getAdditionalImages(root) {
    try {
        return select(root, '.soft')
            .filter(a => a.attribs.alt.startsWith('SAMPLE'))
            .map(a => a.attribs.src.replace('./', 'http://www.getchu.com/'));
    } catch (e) {
        log.debug('Error getting additional images');
    }
}

async function getJapaneseSite(id) {
    try {
        let reply = await callPage(`http://www.getchu.com/soft.phtml?id=${encodeURIComponent(id)}&gc=gc`);
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
            `http://www.getchu.com/review/item_review.php?action=list&id=${encodeURIComponent(id)}`
        );
        const root = parseSite(reply);

        const averageRatingElement = select(root, '.r_ave').shift();

        const averageRatingText =
            averageRatingElement && averageRatingElement.children && averageRatingElement.children.length > 0
                ? averageRatingElement.children[0].data
                : '0.00';

        return {
            communityStars: Number.parseFloat(averageRatingText.match(/\d\.\d\d/)[0])
        };
    } catch (e) {
        log.debug(`Error getting reviews for ${id} from ${getchuStrategy.name}`);
        return undefined;
    }
}
