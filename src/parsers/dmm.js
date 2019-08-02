const request = require('request-promise');
const { parseSite } = require('../html');
const { getVndbData } = require('./vndb');
const moment = require('moment');
const { removeUndefined } = require('../objects');
const log = require('./../logger');

const DMM_ID_REGEX = new RegExp(/[a-z]+_[a-z]*\d+/gi);

class DmmStrategy {
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

let dmmStrategy = new DmmStrategy();
module.exports = dmmStrategy;

async function getJapaneseSite(id) {
    let uri;
    if (id.match(/d_\d+/)) {
        uri = `https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=${id}/`;
    } else if (id.match(/d_[a-z]+\d+/)) {
        uri = `https://www.dmm.co.jp/mono/doujin/-/detail/=/cid=${id}/`;
    } else {
        uri = `https://dlsoft.dmm.co.jp/detail/${id}/`;
    }

    try {
        let reply = await request.get({
            method: 'GET',
            uri: uri
        });
        return getGameMetadata(parseSite(reply));
    } catch (e) {
        log.debug(`Error getting ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message
        });
        return undefined;
    }
}

function getGameMetadata(query) {
    const images = query('.fn-colorbox')
        .map((i, e) => query(e).attr('href'))
        .get();
    const mainImage = images.splice(0, 1)[0];
    const informationList = getInformationList(query);

    return {
        nameJp: getTitle(query),
        genresJp: getGenres(query),
        imageUrlJp: mainImage,
        additionalImages: images,
        descriptionJp: query('.summary__txt')
            .text()
            .trim(),
        releaseDate: informationList['配信開始日']
            ? moment(informationList['配信開始日'], 'YYYY-MM-DD HH:mm').format()
            : undefined,
        series: informationList['シリーズ'] === '----' ? undefined : informationList['シリーズ'],
        tagsJp: informationList['ゲームジャンル'] ? [informationList['ゲームジャンル']] : undefined,
        makerJp: getMaker(query),
        video: getVideo(query),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query)
    };
}

function getInformationList(query) {
    const informationList = {};
    query('.informationList')
        .each((i, e) => {
            const foundKey = query(e)
                .find('.informationList__ttl')
                .text()
                .trim();
            const foundValue = query(e)
                .find('.informationList__txt')
                .text()
                .trim();
            if (foundKey && foundValue) {
                informationList[foundKey] = foundValue;
            }
        })
        .get();
    return informationList;
}

function getCommunityVotes(query) {
    try {
        return Number.parseInt(
            query('.d-review__evaluates strong')
                .text()
                .trim()
                .match(/\d+/)[0]
        );
    } catch (e) {
        log.debug('Could not get community star votes');
    }
}

function getCommunityStars(query) {
    try {
        return Number.parseFloat(
            query('.d-review__average strong')
                .text()
                .trim()
                .match(/(\d+(\.\d+)?)/)[0]
        );
    } catch (e) {
        log.debug('Could not get community stars');
    }
}

function getGenres(query) {
    return query('.genreTag__txt')
        .map((i, e) =>
            query(e)
                .text()
                .trim()
        )
        .get();
}

function getMaker(query) {
    try {
        return query('.circleName__txt')
            .text()
            .trim();
    } catch (e) {
        log.debug('Maker not found or wrong');
    }
}

function getTitle(query) {
    try {
        return query('meta[property="og:title"]')
            .attr('content')
            .trim();
    } catch (e) {
        log.debug('Og:title meta property not found or wrong');
    }
}

function getVideo(query) {
    try {
        return query('.productPreview__item source').attr('src');
    } catch (e) {
        log.debug('Could not get video source');
    }
}
