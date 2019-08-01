const select = require('soupselect').select;
const request = require('request-promise');
const { parseSite } = require('../html');
const { getVndbData } = require('./vndb');
const moment = require('moment');
const { removeUndefined } = require('../objects');
const log = require('./../logger');

const DMM_ID_REGEX = new RegExp(/[a-z]+_[a-z]*\d+/gi);

class DummyStrategy {
    constructor() {
        this.name = 'dmm';
    }

    async fetchGameData(gameId) {
        const jpn = await getJapaneseSite(gameId);
        let eng;

        if (jpn && jpn.nameJp) {
            log.debug(`Getting english site for ${jpn.nameJp}`);
            eng = await getVndbData(jpn.nameJp);
        }

        const result = {};
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(DMM_ID_REGEX);
        return matches ? matches[0] : '';
    }

    async findGame(name) {
        return []; //TODO: findName
    }

    async getAdditionalImages(id) {
        const site = await getJapaneseSite(id);
        return site.additionalImages;
    }

    shouldUse(gameId) {
        return gameId.match(DMM_ID_REGEX);
    }
}

let dummyStrategy = new DummyStrategy();
module.exports = dummyStrategy;

async function getJapaneseSite(id) {
    let uri;
    if(id.match(/d_\d+/)) {
        uri = `https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=${id}/`
    } else if(id.match(/d_[a-z]+\d+/)) {
        uri = `https://www.dmm.co.jp/mono/doujin/-/detail/=/cid=${id}/`
    } else {
        uri = `https://dlsoft.dmm.co.jp/detail/${id}/`
    }

    try {
        let reply = await request.get({
            method: 'GET',
            uri: uri
        });
        const root = parseSite(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.debug(`Error getting ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message
        });
        return undefined;
    }
}

function getGameMetadata(root) {
    const images = select(root, '.fn-colorbox')
        .map(a => (a.attribs ? a.attribs.href : ''))
        .filter(a => a !== '');
    const mainImage = images.splice(0, 1)[0];
    const informationList = getInformationList(root);

    return {
        nameJp: getTitle(root),
        genresJp: getGenres(root),
        imageUrlJp: mainImage,
        additionalImages: images,
        descriptionJp: select(root, '.summary__txt')
            .pop()
            .children.filter(c => c.type === 'text')
            .map(c => c.data.trim())
            .join('\n'),
        releaseDate: informationList['配信開始日']
            ? moment(informationList['配信開始日'], 'YYYY-MM-DD HH:mm').format()
            : undefined,
        series: informationList['シリーズ'] === '----' ? undefined : informationList['シリーズ'],
        tagsJp: informationList['ゲームジャンル'] ? [informationList['ゲームジャンル']] : undefined,
        makerJp: getMaker(root),
        video: getVideo(root),
        communityStars: getCommunityStars(root),
        communityStarVotes: getCommunityVotes(root)
    };
}

function getInformationList(root) {
    const informationList = {};
    select(root, '.informationList').forEach(il => {
        try {
            let keyElement = il.children.find(c => c.attribs && c.attribs.class.includes('informationList__ttl'));
            let valueElement = il.children.find(c => c.attribs && c.attribs.class.includes('informationList__txt'));
            if (keyElement && valueElement) {
                let foundKey = keyElement.children.find(c => c.type === 'text').data.trim();
                let foundValue = valueElement.children.find(c => c.type === 'text').data.trim();
                informationList[foundKey] = foundValue;
            }
        } catch (e) {
            log.debug('Could not get information list');
        }
    });
    return informationList;
}

function getCommunityVotes(root) {
    try {
        return Number.parseInt(
            select(root, '.d-review__evaluates strong')[0]
                .children.find(c => c.type === 'text')
                .data.trim()
                .match(/\d+/)[0]
        );
    } catch (e) {
        log.debug('Could not get community star votes');
    }
}

function getCommunityStars(root) {
    try {
        return Number.parseFloat(
            select(root, '.d-review__average strong')[0]
                .children.find(c => c.type === 'text')
                .data.trim()
                .match(/(\d+(\.\d+)?)/)[0]
        );
    } catch (e) {
        log.debug('Could not get community stars');
    }
}

function getGenres(root) {
    return select(root, '.genreTag__txt')
        .map(t => {
            try {
                return t.children.find(c => c.type === 'text').data.trim();
            } catch (e) {
                log.debug('Genres could not be mapped');
            }
        })
        .filter(g => g !== '');
}

function getMaker(root) {
    try {
        return select(root, '.circleName__txt')[0]
            .children.find(c => c.type === 'text')
            .data.trim();
    } catch (e) {
        log.debug('Maker not found or wrong');
    }
}

function getTitle(root) {
    try {
        return select(root, 'meta[property="og:title"]')[0].attribs.content;
    } catch (e) {
        log.debug('Og:title meta property not found or wrong');
    }
}

function getVideo(root) {
    try {
        return select(root, '.productPreview__item source')[0].attribs.src;
    } catch (e) {
        log.debug('Could not get video source');
    }
}
