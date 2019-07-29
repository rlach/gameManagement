const iconv = require('iconv-lite');
const htmlparser = require('htmlparser');
const select = require('soupselect').select;
const request = require('request-promise');
const log = require('./../logger');
const moment = require('moment');

const GETCHU_ID_REGEX = /\d{6,8}/gi;
const JAPANESE_ENCODING = 'EUC-JP';

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
            log.info(`Getting english site for ${jpn.name}`);
            const engResult = await getEnglishSite(jpn.name);
            if (engResult) {
                eng = engResult;
            }
        }

        const reviews = await getReviews(gameId);

        return {
            releaseDate: jpn.releaseDate ? jpn.releaseDate : eng.releaseDate,
            communityStars: reviews && reviews.averageRating ? reviews.averageRating : undefined,
            nameEn: eng.name,
            nameJp: jpn.name,
            descriptionEn: eng.description,
            descriptionJp: jpn.description,
            genresEn: eng.genres,
            genresJp: jpn.genres,
            tagsEn: eng.tags,
            tagsJp: jpn.tags,
            makerEn: eng.maker,
            makerJp: jpn.maker,
            imageUrlJp: jpn.image,
            imageUrlEn: eng.image
        };
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(GETCHU_ID_REGEX);
        return matches ? matches[0] : '';
    }

    async callFindGame(name) {
        return new Promise((resolve, reject) => {
            request
                .get({
                    uri: `http://www.getchu.com/php/search.phtml?search_keyword=${encodeURIComponent(
                        name
                    )}&list_count=30&sort=sales&sort2=down&search_title=&search_brand=&search_person=&search_jan=&search_isbn=&genre=pc_soft&start_date=&end_date=&age=&list_type=list&gc=gc&search=search`
                })
                .pipe(iconv.decodeStream(JAPANESE_ENCODING))
                .collect(function(err, decodedBody) {
                    if (err) {
                        return reject(err);
                    } else {
                        return resolve(decodedBody);
                    }
                });
        });
    }

    async findGame(name) {
        const reply = await this.callFindGame(name);
        // await files.writeFile(`${name}.html`, reply);
        const root = parseSite(reply);
        // log.info('selected blueb', JSON.stringify(select(root, '.blueb'), null, 4));
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

    shouldUse(gameId) {
        return gameId.match(GETCHU_ID_REGEX) !== undefined;
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
            name: titleElement && titleElement.children[0] ? titleElement.children[0].data.trim() : '',
            releaseDate: releaseDayText ? moment(releaseDayText, 'YYYY/MM/DD').format() : undefined,
            description: description
                .map(desc => desc.children.map(descChild => (descChild.type === 'text' ? descChild.data : '')))
                .join('\n'),
            maker: makerElement && makerElement.attribs ? makerElement.attribs.title.trim() : '',
            image:
                imageElement && imageElement.attribs
                    ? imageElement.attribs.href.replace('.', 'http://www.getchu.com')
                    : ''
        };
    } catch (e) {
        log.error('Metadata parsing failure', { e, root });
    }
}

//There is no English getchu, let's try getting data from VNDB
const VNDB = require('vndb');
const VNDBtags = require('./vndb-tags');

async function getEnglishSite(name) {
    let improvedName = name.replace(/\(([^)]+)\)/g, ''); //remove ()
    improvedName = improvedName.replace(/（([^)]+)）/g, ''); //remove japanese ()
    improvedName = improvedName.replace(/・/g, ''); // replace bad characters
    log.info('Improved name', improvedName);
    let vndb;
    try {
        vndb = await VNDB.start();
        await vndb.write('login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}');
        let foundVNs = JSON.parse(
            (await vndb.write(
                `get vn basic,details,tags (original~"${improvedName}" or title~"${improvedName}")`
            )).replace('results ', '')
        );

        let VN;
        if (foundVNs.num > 0) {
            VN = foundVNs.items[0];
        }

        if (!VN) {
            improvedName = improvedName.substring(0, improvedName.length / 2);
            foundVNs = JSON.parse(
                (await vndb.write(
                    `get vn basic,details,tags (original~"${improvedName}" or title~"${improvedName}")`
                )).replace('results ', '')
            );
            if (foundVNs.num > 0) {
                VN = foundVNs.items[0];
            } else {
                return undefined;
            }
        }

        const tags = VN.tags
            .filter(tag => tag[1] > 1)
            .map(tag => {
                const foundTag = VNDBtags.find(t => t.id === tag[0]);
                return foundTag ? foundTag : '';
            })
            .filter(tag => tag !== '');

        log.info('About to return VN');
        return {
            name: VN.title,
            releaseDate: moment(VN.released, 'YYYY-MM-DD').format(),
            description: VN.description,
            genres: tags.filter(t => t.cat === 'ero').map(t => t.name),
            tags: tags.filter(t => t.cat === 'tech').map(t => t.name),
            image: VN.image
        };
    } catch (e) {
        log.info('Bluh');
        log.error('Something happened when connecting to VNDB API', e);
    } finally {
        if (vndb) {
            await vndb.end();
        }
    }

    log.info('returning undefined');
    return undefined;
}

function parseSite(rawHtml) {
    const handler = new htmlparser.DefaultHandler(function(error, dom) {
        if (error) {
            log.error('Error parsing html', error);
        } else {
            log.debug('Parsing done!');
        }
    });
    const parser = new htmlparser.Parser(handler);
    parser.parseComplete(rawHtml);
    log.debug('Dom parsed!');
    return handler.dom;
}

async function getJapaneseSite(id) {
    try {
        let reply = await callPage(`http://www.getchu.com/soft.phtml?id=${encodeURIComponent(id)}&gc=gc`);
        const root = parseSite(reply);
        return getGameMetadataJp(root);
    } catch (e) {
        log.warn(`Error getting ${id} from ${getchuStrategy.name}`, e);
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
            averageRating: Number.parseFloat(averageRatingText.match(/\d\.\d\d/)[0])
        };
    } catch (e) {
        log.warn(`Error getting reviews for ${id} from ${getchuStrategy.name}`);
        return undefined;
    }
}

async function callPage(uri) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            reject('Promise timed out after ' + 30000 + ' ms');
        }, 30000);

        request
            .get({
                method: 'GET',
                uri: uri,
                encoding: null
            })
            .pipe(iconv.decodeStream(JAPANESE_ENCODING))
            .collect(function(err, decodedBody) {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(decodedBody);
                }
            });
    });
}
