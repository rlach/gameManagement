const iconv = require('iconv-lite');
const htmlParser = require('node-html-parser/dist/index');
const request = require('request-promise');
const log = require('./../logger');
const settings = require('./../settings');
const files = require('./../files');

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
        log.info('Got jpn', jpn);
        if (jpn.name) {
            log.info(`Getting english site for ${jpn.name}`);
            const engResult = await getEnglishSite(jpn.name);
            log.info('Got eng', engResult);
            if (engResult) {
                eng = engResult;
            }
        }

        return {
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
        log.info('name', { name });
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
        const root = htmlParser.parse(reply);
        const works = root.querySelectorAll('.blueb').map(b => {
            return {
                work_name: b.text.trim(),
                workno: b.attributes.HREF ? b.attributes.HREF.match(GETCHU_ID_REGEX) : ''
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
        const titleElement = root.querySelector('#soft-title');
        const makerElement = root.querySelector('.glance');
        const imageElement = root.querySelector('.highslide');

        return {
            name: titleElement && titleElement.firstChild ? titleElement.firstChild.text.trim() : '',
            // description: root
            //     .querySelectorAll('.tablebody')
            //     .map(t => t.text)
            //     .join(' ')
            // genres: root
            //     .querySelector('.main_genre')
            //     .childNodes.map(node => node.text.trim())
            //     .filter(n => n !== ''),
            // tags: root
            //     .querySelector('.work_genre')
            //     .childNodes.map(node => node.text.trim())
            //     .filter(n => n !== ''),
            maker: makerElement ? makerElement.text.trim() : '',
            image: imageElement && imageElement.attributes ? imageElement.attributes.HREF : ''
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
            description: VN.description,
            genres: tags.filter(t => t.cat === 'ero').map(t => t.name),
            tags: tags.filter(t => t.cat === 'tech').map(t => t.name),
            // maker: root.querySelector('.maker_name').text.trim(),
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

async function getJapaneseSite(id) {
    try {
        let reply = await callGetPage(id);
        const root = htmlParser.parse(reply);
        return getGameMetadataJp(root);
    } catch (e) {
        log.error(`Error getting ${id} from ${getchuStrategy.name}`, e);
        return undefined;
    }
}

async function callGetPage(id) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            reject('Promise timed out after ' + 3000 + ' ms');
        }, 3000);

        request
            .get({
                method: 'GET',
                uri: `http://www.getchu.com/sp/soft.phtml?id=${encodeURIComponent(id)}&gc=gc`,
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
