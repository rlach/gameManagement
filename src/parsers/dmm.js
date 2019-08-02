const request = require('request-promise');
const { parseSite } = require('../html');
const { getVndbData } = require('../vndb');
const moment = require('moment');
const { removeUndefined } = require('../objects');
const log = require('./../logger');

const DMM_ID_REGEX = new RegExp(/[a-z]+_[a-z]*\d+/gi);

class DmmStrategy {
    constructor() {
        this.name = 'dmm';
    }

    async fetchGameData(gameId) {
        const jpn = await getSite(gameId);
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
        const site = await getSite(id);
        return site.additionalImages;
    }

    shouldUse(gameId) {
        return gameId.match(DMM_ID_REGEX);
    }
}

let dmmStrategy = new DmmStrategy();
module.exports = dmmStrategy;

async function getSite(id) {
    let uri;
    let method;
    if (id.match(/d_\d+/)) {
        uri = `https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=${id}/`;
        method = getGameMetadata;
    } else if (id.match(/d_[a-z]+\d+/)) {
        uri = `https://www.dmm.co.jp/mono/doujin/-/detail/=/cid=${id}/`;
        method = getMonoGameMetadata;
    } else {
        uri = `https://dlsoft.dmm.co.jp/detail/${id}/`;
        method = getProGameMetadata;
    }

    try {
        let reply = await request.get({
            method: 'GET',
            uri: uri
        });
        return method(parseSite(reply));
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

function getMonoGameMetadata(query) {
    const releaseDateText = findTableValue(query, '発売日')
        .find('td')
        .last()
        .text();
    const seriesText = findTableValue(query, 'シリーズ')
        .find('td')
        .last()
        .text()
        .trim();

    return {
        nameJp: getTitle(query),
        genresJp: findTableValue(query, 'ジャンル')
            .find('a')
            .map((i, e) => query(e).text())
            .get(),
        imageUrlJp: query('a[name="package-image"]').attr('href'),
        additionalImages: query('a[name="sample-image"] img')
            .map((i, e) => query(e).attr('src'))
            .get(),
        descriptionJp: query('div.mg-b20.lh4 p.mg-b20')
            .text()
            .trim(),
        releaseDate: releaseDateText ? moment(releaseDateText, 'YYYY-MM-DD').format() : undefined,
        series: seriesText === '----' ? undefined : seriesText,
        tagsJp: query('.side-menu')
            .filter((i, e) =>
                query(e)
                    .find('p')
                    .text()
                    .includes('題材ジャンル')
            )
            .find('a')
            .map((i, e) =>
                query(e)
                    .text()
                    .trim()
            )
            .get(),
        makerJp: findTableValue(query, 'サークル名')
            .find('td')
            .last()
            .text()
            .trim(),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query)
    };
}

function findTableValue(query, value) {
    return query('table.mg-b20 tr').filter((i, e) =>
        query(e)
            .find('td')
            .text()
            .includes(value)
    );
}

function getProGameMetadata(query) {
    const images = query('#item-rotationbnr img')
        .map((i, e) => query(e).attr('src'))
        .get();
    const softwareDetail = getSoftwareDetail(query);

    return {
        nameJp: getTitle(query),
        genresJp: query('table[summary="ジャンル"] a')
            .map((i, e) =>
                query(e)
                    .text()
                    .trim()
            )
            .get(),
        imageUrlJp: query('.bx-package img').attr('src'),
        additionalImages: images,
        descriptionJp: query('.area-detail-read .text-overflow')
            .text()
            .trim(),
        releaseDate: softwareDetail['配信開始日']
            ? moment(softwareDetail['配信開始日'], 'YYYY-MM-DD').format()
            : undefined,
        series: softwareDetail['シリーズ'] === '----' ? undefined : softwareDetail['シリーズ'],
        tagsJp: softwareDetail['ゲームジャンル'] ? [softwareDetail['ゲームジャンル']] : undefined,
        makerJp: query('.area-bskt a')
            .filter((i, e) =>
                query(e)
                    .attr('href')
                    .includes('article=maker')
            )
            .text()
            .trim(),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query)
    };
}

function getSoftwareDetail(query) {
    const softwareDetail = {};
    query('.software-detail table')
        .not('.spec-table')
        .not('.tbl-bps')
        .find('tr')
        .each((i, e) => {
            const foundKey = query(e)
                .find('td')
                .first()
                .text()
                .replace('：', '')
                .trim();
            const foundValue = query(e)
                .find('td')
                .last()
                .text()
                .trim();
            softwareDetail[foundKey] = foundValue;
        })
        .get();
    return softwareDetail;
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
