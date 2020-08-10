const request = require('request-promise');
const { parseSite } = require('../util/html');
const vndb = require('../util/vndb');
const moment = require('moment');
const { removeUndefined } = require('../util/objects');
const log = require('../util/logger');
const SiteStrategy = require('./siteStrategy');

const DMM_ID_REGEX = new RegExp(/[a-z]+_[a-z]*\d+/gi);

class DmmStrategy extends SiteStrategy {
    constructor(settings) {
        super('dmm', settings);
    }

    async fetchGameData(gameId, game) {
        const sourceMissing = game ? game.sourceMissingJp : undefined;
        const jpn = await this.getSite(gameId, sourceMissing);
        let eng;

        if (jpn && jpn.nameJp) {
            log.debug(`Getting english site for ${jpn.nameJp}`);
            eng = await vndb.getVNByName(jpn.nameJp);
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
        const results = await Promise.all([
            getDoujinResults(name),
            getProResults(name),
        ]);

        return [...results[0], ...results[1]];
    }

    async getAdditionalImages(id) {
        const site = await this.getSite(id);
        return site.additionalImages;
    }

    async getSite(id, sourceMissing) {
        if (sourceMissing) {
            return undefined;
        }
        let uri;
        let method;
        const ageCheckUrl = `https://www.dmm.co.jp/age_check/=/declared=yes/?rurl=https%3A%2F%2Fwww.dmm.co.jp%2Fmono%2Fdoujin%2F-%2Fdetail%2F%3D%2Fcid%3Dd_aisoft2638%2F`;
        let performAgeCheck = true;
        if (id.match(/d_\d+/)) {
            uri = `https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=${id}/`;
            method = getDoujinMetadata;
        } else if (id.match(/d_[a-z]+\d+/)) {
            uri = `https://www.dmm.co.jp/mono/doujin/-/detail/=/cid=${id}/`;
            method = getMonoGameMetadata;
        } else {
            uri = `https://dlsoft.dmm.co.jp/detail/${id}/`;
            method = getProMetadata;
            performAgeCheck = false;
        }

        try {
            let requestWithJar = request.defaults({ jar: true });
            if (performAgeCheck) {
                await requestWithJar.get({
                    method: 'GET',
                    uri: ageCheckUrl,
                });
            }

            let reply = await requestWithJar.get({
                method: 'GET',
                uri: uri,
            });
            return method(parseSite(reply));
        } catch (e) {
            log.debug(`Error getting ${id} from ${this.name}`, {
                name: e.name,
                statusCode: e.statusCode,
                message: e.message,
            });
            if (e.statusCode === 404) {
                return {
                    sourceMissingJp: true,
                };
            } else {
                return undefined;
            }
        }
    }

    shouldUse(gameId) {
        return !!gameId.match(/^[a-z]+_[a-z]*\d+$/gi);
    }

    /* istanbul ignore next */
    async selfTest() {
        const [
            fetchDoujinGameData,
            fetchMonoGameData,
            fetchProGameData,
        ] = await Promise.all([
            this.getSite(this.settings.dmm.testSiteDoujin),
            this.getSite(this.settings.dmm.testSiteMono),
            this.getSite(this.settings.dmm.testSitePro),
        ]);

        const expectedDoujinGameData = this.settings.dmm.expectedDoujinGameData;

        const expectedMonoGameData = this.settings.dmm.expectedMonoGameData;

        const expectedProGameData = this.settings.dmm.expectedProGameData;

        return [
            super.test(
                'get doujin game data',
                fetchDoujinGameData,
                expectedDoujinGameData,
                'expectedDoujinGameData'
            ),
            super.test(
                'get mono game data',
                fetchMonoGameData,
                expectedMonoGameData,
                'expectedMonoGameData'
            ),
            super.test(
                'get pro game data',
                fetchProGameData,
                expectedProGameData,
                'expectedProGameData'
            ),
        ];
    }
}

module.exports = DmmStrategy;

async function getDoujinResults(name) {
    const uri = `https://www.dmm.co.jp/search/=/searchstr=${encodeURIComponent(
        name
    )}/analyze=V1EBAFYOUQA_/limit=30/n1=FgRCTw9VBA4GAV5NWV8I/n2=Aw1fVhQKX1ZRAlhMUlo5Uw4QXF9e/sort=ranking/#hd-search-area`;
    log.debug('Uri called for search', uri);

    const reply = await request.get({
        method: 'GET',
        uri: uri,
    });

    const query = parseSite(reply);
    return query('.tileListTtl__txt a')
        .map((i, e) => {
            const matchedId = query(e)
                .attr('href')
                .match(DMM_ID_REGEX);
            return matchedId
                ? {
                      workno: matchedId[0],
                      work_name: query(e)
                          .text()
                          .trim(),
                  }
                : null;
        })
        .get()
        .filter(e => e !== null);
}

async function getProResults(name) {
    const uri = `https://www.dmm.co.jp/search/=/searchstr=${encodeURIComponent(
        name
    )}/analyze=V1EBAFYOUQA_/limit=30/n1=FgRCTw9VBA4GFVJfUlsD/n2=Aw1fVhQKX1ZRAlhMUlo5RwICV1tV/sort=ranking/#hd-search-area`;
    log.debug('Uri called for search', uri);

    const reply = await request.get({
        method: 'GET',
        uri: uri,
    });

    const query = parseSite(reply);
    return query('.d-sect .d-item #list .tmb a')
        .filter((i, e) =>
            query(e)
                .attr('href')
                .includes('ref=search')
        )
        .map((i, e) => {
            const matchedId = query(e)
                .attr('href')
                .match(DMM_ID_REGEX);
            return matchedId
                ? {
                      workno: matchedId[0],
                      work_name: query(e)
                          .find('img')
                          .attr('alt')
                          .trim(),
                  }
                : null;
        })
        .get()
        .filter(e => e !== null);
}

function getDoujinMetadata(query) {
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
        series:
            informationList['シリーズ'] === '----'
                ? undefined
                : informationList['シリーズ'],
        tagsJp: informationList['ゲームジャンル']
            ? [informationList['ゲームジャンル']]
            : undefined,
        makerJp: getMaker(query),
        video: getVideo(query),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query),
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
        releaseDate: releaseDateText
            ? moment(releaseDateText, 'YYYY-MM-DD').format()
            : undefined,
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
        communityStarVotes: getCommunityVotes(query),
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

function getProMetadata(query) {
    const images = query('.image-slider img')
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
        imageUrlJp: query('meta[property="og:image"]')
            .attr('content')
            .trim(),
        additionalImages: images,
        descriptionJp: query('.area-detail-read .text-overflow')
            .text()
            .trim(),
        releaseDate: softwareDetail['配信開始日']
            ? moment(softwareDetail['配信開始日'], 'YYYY-MM-DD').format()
            : undefined,
        series:
            softwareDetail['シリーズ'] === '----'
                ? undefined
                : softwareDetail['シリーズ'],
        tagsJp: softwareDetail['ゲームジャンル']
            ? [softwareDetail['ゲームジャンル']]
            : undefined,
        makerJp: query('.brand .content')
            .text()
            .trim(),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query),
    };
}

function getSoftwareDetail(query) {
    const softwareDetail = {};
    query('.container02 table')
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
            softwareDetail[foundKey] = query(e)
                .find('td')
                .last()
                .text()
                .trim();
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
    return query('.circleName__txt')
        .text()
        .trim();
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
    return query('.productPreview__item source').attr('src');
}
