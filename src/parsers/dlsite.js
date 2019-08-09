const request = require('request-promise');
const log = require('./../logger');
const moment = require('moment');
const { parseSite } = require('../html');
const { getVndbData } = require('../vndb');
const SiteStrategy = require('./siteStrategy');
const { removeUndefined } = require('../objects');
const settings = require('../settings');

class DlsiteStrategy extends SiteStrategy {
    constructor() {
        super('dlsite');
    }

    async fetchGameData(gameId, game) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);
        let jpn = {};
        let eng = {};
        if (gameId.startsWith('RJ')) {
            const sites = await Promise.all([
                getJapaneseSite(gameId, game.sourceMissingJp),
                getEnglishSite(gameId, game.sourceMissingEn),
            ]);
            jpn = sites[0] ? sites[0] : {};
            eng = sites[1] ? sites[1] : {};
        } else if (gameId.startsWith('RE')) {
            const engSite = await getEnglishSite(gameId, game.sourceMissingEn);
            eng = engSite ? engSite : {};
        } else if (gameId.startsWith('VJ')) {
            const jpnSite = await getProSite(gameId, game.sourceMissingJp);
            jpn = jpnSite ? jpnSite : {};
            if (jpn.nameJp) {
                eng = await getVndbData(jpn.nameJp);
                if (!eng) {
                    eng = {};
                }
                log.debug('Got eng', eng);
            }
        } else {
            log.debug('Wrong file for strategy', { name: this.name, gameId });
            return;
        }

        let productInfo;
        if (eng.nameEn || jpn.nameJp) {
            productInfo = await getProductInfo(gameId);
        }

        const result = {
            communityStars: productInfo
                ? productInfo.rate_average_2dp
                : undefined,
            communityStarVotes: productInfo
                ? productInfo.rate_count
                : undefined,
        };
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(/((RE)|(RJ)|(VJ))\d+/gi);
        return matches ? matches.find(matched => matched.length === 8) : '';
    }

    async findGame(name) {
        const replies = await Promise.all([
            search(name, 'adult-jp'),
            search(name, 'adult-en'),
            search(name, 'pro'),
        ]);
        let replyEn = replies[1];
        let replyJp = replies[0];
        let replyPro = replies[2];

        const works = [];

        if (replyEn.work.length === 0) {
            const replyEn2 = await search(
                name.substring(0, name.length / 2),
                'adult-en'
            );
            works.push(...replyEn2.work);
        } else {
            works.push(...replyEn.work);
        }

        if (replyJp.work.length === 0) {
            const replyJp2 = await search(
                name.substring(0, name.length / 2),
                'adult-jp'
            );
            works.push(...replyJp2.work);
        } else {
            works.push(...replyJp.work);
        }

        if (replyPro.work.length === 0) {
            const replyPro2 = await search(
                name.substring(0, name.length / 2),
                'pro'
            );
            works.push(...replyPro2.work);
        } else {
            works.push(...replyPro.work);
        }

        return works;
    }

    async getAdditionalImages(id) {
        log.debug(`Getting additional images for ${id}`);
        try {
            let url = `https://www.dlsite.com/maniax/popup/=/file/smp1/product_id/${id}.html`;
            if (id.startsWith('RE')) {
                url = `https://www.dlsite.com/ecchi-eng/popup/=/file/smp1/product_id/${id}.html`;
            } else if (id.startsWith('VJ')) {
                url = `https://www.dlsite.com/pro/popup/=/file/smp1/product_id/${id}.html`;
            }
            let reply = await request.get({
                method: 'GET',
                uri: url,
            });

            const query = parseSite(reply);

            if (id.startsWith('VJ')) {
                return query('.target_type')
                    .map((i, e) =>
                        query(e)
                            .attr('src')
                            .replace('//', 'http://')
                    )
                    .get();
            } else {
                const samplesCount = parseInt(
                    query('#page')
                        .text()
                        .replace('1/', '')
                        .trim()
                );
                const firstImage = query('.target_type')
                    .attr('src')
                    .replace('//', 'http://');
                log.debug(`Samples found`, {
                    samplesCount,
                    id,
                    firstImage,
                });

                const additionalImages = [];
                for (let i = 1; i <= samplesCount; i++) {
                    additionalImages.push(
                        firstImage.replace('smp1', `smp${i}`)
                    );
                }

                return additionalImages;
            }
        } catch (e) {
            log.debug(
                `Error getting additional images for ${id} from ${this.name}`,
                {
                    name: e.name,
                    statusCode: e.statusCode,
                    message: e.message,
                }
            );
            return undefined;
        }
    }

    shouldUse(gameId) {
        return (
            gameId.startsWith('RJ') ||
            gameId.startsWith('RE') ||
            gameId.startsWith('VJ')
        );
    }

    scoreCodes(codes, originalFilename) {
        const results = super.scoreCodes(codes, originalFilename);
        const extractedCode = codes.extractedCode;

        // Points for extracted code and extracted code matching found result
        if (extractedCode !== '') {
            this.addToCodeScore(
                results,
                settings.advanced.scores.extractedDlsiteCode,
                extractedCode
            );
            if (codes.foundCodes.some(fc => fc.workno === extractedCode)) {
                this.addToCodeScore(
                    results,
                    settings.advanced.scores.matchForExtractedDlsiteCode,
                    extractedCode
                );
            }
        }

        return results;
    }

    addToCodeScore(bossCodes, CODE_WEIGHT, code, name) {
        const improvedCode = code.replace('RE', 'RJ');
        super.addToCodeScore(bossCodes, CODE_WEIGHT, improvedCode, name);
    }
}

let dlsiteStrategy = new DlsiteStrategy();
module.exports = dlsiteStrategy;

async function search(name, site) {
    return JSON.parse(
        await request.get({
            uri: `https://www.dlsite.com/suggest/?site=${site}&time=${new Date().getTime()}&term=${encodeURIComponent(
                name
            )}`,
        })
    );
}

function getOptions(id, type) {
    let dlsiteDomain;
    switch (type) {
        case 'en':
            dlsiteDomain = '/ecchi-eng/work/';
            break;
        case 'proAnnounce':
            dlsiteDomain = '/pro/announce/';
            break;
        case 'pro':
            dlsiteDomain = '/pro/work/';
            break;
        case 'jp':
        default:
            dlsiteDomain = '/maniax/work/';
    }

    return {
        method: 'GET',
        uri: `https://www.dlsite.com${dlsiteDomain}=/product_id/${encodeURIComponent(
            id
        )}.html`,
    };
}

function getGameMetadata(query) {
    try {
        let imageSrc = query('.slider_item img')
            .attr('src')
            .replace('//', 'http://');

        let releaseDateMoment;
        let releaseDate;
        const dateText = query('#work_outline a')
            .filter(
                (i, e) =>
                    query(e).attr('href') &&
                    query(e)
                        .attr('href')
                        .includes('/year')
            )
            .text()
            .trim();
        if (/\d/.test(dateText[0])) {
            releaseDateMoment = moment(dateText, 'YYYY-MM-DD-'); //Japanese format
        } else {
            releaseDateMoment = moment(dateText, 'MMM-DD-YYYY'); //English format
        }
        log.debug('releaseDate', releaseDateMoment);
        if (releaseDateMoment.isValid()) {
            releaseDate = releaseDateMoment.format();
        }

        let seriesText;
        try {
            seriesText = query('#work_outline a')
                .filter((i, e) =>
                    query(e)
                        .attr('href')
                        .includes('work.series')
                )
                .text()
                .trim();
        } catch (e) {
            log.debug('Series text missing or invalid');
        }

        let genres;
        try {
            genres = query('.main_genre a')
                .map((i, e) =>
                    query(e)
                        .text()
                        .trim()
                )
                .get();
        } catch (e) {
            log.debug('Could not get genres');
        }

        const description = query('.work_article')
            .text()
            .trim();
        const tags = query('.work_genre span')
            .map((i, e) => query(e).attr('title'))
            .get();

        const workName = query('#work_name a')
            .text()
            .trim();
        const maker = query('.maker_name a')
            .text()
            .trim();

        return {
            series: seriesText,
            name: workName,
            description: description,
            genres: genres,
            tags: tags,
            releaseDate: releaseDate,
            maker: maker,
            image: imageSrc,
        };
    } catch (e) {
        log.debug('Metadata parsing failure', e);
    }
}

async function getEnglishSite(id, sourceMissing) {
    if (id.startsWith('VJ') || sourceMissing) {
        return undefined;
    }

    const idEn = id.replace('RJ', 'RE');

    try {
        const reply = await request.get(getOptions(idEn, 'en'));
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameEn: originalMetadata.name,
            description: originalMetadata.descriptionEn,
            genresEn: originalMetadata.genres,
            tagsEn: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerEn: originalMetadata.maker,
            imageUrlEn: originalMetadata.image,
        };
    } catch (e) {
        log.debug(`Error getting ${idEn} from ${dlsiteStrategy.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message,
        });
        if (e.statusCode === 404) {
            return {
                sourceMissingEn: true,
            };
        } else {
            return undefined;
        }
    }
}

async function getProductInfo(id) {
    try {
        return JSON.parse(
            await request.get({
                method: 'GET',
                uri: `https://www.dlsite.com/maniax/product/info/ajax?product_id=${id}`,
            })
        )[id];
    } catch (e) {
        log.debug(`Error getting productInfo for ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message,
        });
        return undefined;
    }
}

async function getJapaneseSite(id, sourceMissing) {
    if (sourceMissing) {
        return undefined;
    }
    try {
        let reply = await request.get(getOptions(id, 'jp'));
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameJp: originalMetadata.name,
            description: originalMetadata.descriptionEn,
            genresJp: originalMetadata.genres,
            tagsJp: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerJp: originalMetadata.maker,
            imageUrlJp: originalMetadata.image,
        };
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

async function getProSite(id, sourceMissing) {
    if (sourceMissing) {
        return undefined;
    }
    try {
        let reply;
        try {
            reply = await request.get(getOptions(id, 'pro'));
        } catch (e) {
            if (e.statusCode === 404) {
                log.debug('Pro does not exist, trying announce', { id });
                reply = await request.get(getOptions(id, 'proAnnounce'));
            } else {
                throw e;
            }
        }
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameJp: originalMetadata.name,
            description: originalMetadata.descriptionEn,
            genresJp: originalMetadata.genres,
            tagsJp: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerJp: originalMetadata.maker,
            imageUrlJp: originalMetadata.image,
        };
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
