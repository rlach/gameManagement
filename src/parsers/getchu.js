const iconv = require('iconv-lite');
const htmlParser = require('node-html-parser/dist/index');
const request = require('request-promise');
const log = require('./../logger');
const settings = require('./../settings');
const files = require('./../files');

const GETCHU_ID_REGEX = /\d{6,8}/gi;

class GetchuStrategy {
    constructor() {
        this.name = 'getchu';
        this.pathName = settings.paths.dlsite;
    }

    async fetchGameData(gameId) {
        log.debug(`Fetching game ${gameId}`);

        const sites = await Promise.all([getJapaneseSite(gameId), getEnglishSite(gameId)]);
        const jpn = sites[0] ? sites[0] : {};
        const eng = sites[1] ? sites[1] : {};

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

    async findGame(name) {
        return [];
    }

    shouldUse(gameId) {
        return gameId.match(GETCHU_ID_REGEX) !== undefined;
    }
}

let getchuStrategy = new GetchuStrategy();
module.exports = getchuStrategy;

function getGameMetadataJp(root) {
    try {
        return {
            name: root.querySelector('#soft-title').firstChild.text.trim()
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
            // maker: root.querySelector('.maker_name').text.trim(),
            // image: root.querySelector('.slider_item').firstChild.attributes.src
        };
    } catch (e) {
        log.error('Metadata parsing failure', { e, root });
    }
}

function getGameMetadataEn(root) {
    try {
        return {
            name: root
                .querySelector('#soft-title .notranslate')
                .childNodes[root.querySelector('#soft-title .notranslate').childNodes.length - 2].text.trim()
            // description: root.querySelector('.work_article').text.trim(),
            // genres: root
            //     .querySelector('.main_genre')
            //     .childNodes.map(node => node.text.trim())
            //     .filter(n => n !== ''),
            // tags: root
            //     .querySelector('.work_genre')
            //     .childNodes.map(node => node.text.trim())
            //     .filter(n => n !== ''),
            // maker: root.querySelector('.maker_name').text.trim(),
            // image: root.querySelector('.slider_item').firstChild.attributes.src
        };
    } catch (e) {
        log.error('Metadata parsing failure', { e, root });
    }
}

async function getEnglishSite(id) {
    try {
        let reply = await request.get({
            method: 'GET',
            uri: `https://translate.googleusercontent.com/translate_c?depth=1&hl=pl&nv=1&rurl=translate.google.pl&sl=auto&sp=nmt4&tl=en&u=http://www.getchu.com/sp/soft.phtml%3Fid%3D${id}%26gc%3Dgc&xid=17259,15700022,15700186,15700191,15700256,15700259,15700262,15700265&usg=ALkJrhhz0aTF7nKShQH7BbJn5uR_ca4A6A`
        });
        // await files.writeFile(`${id}-en.html`, reply);
        const root = htmlParser.parse(reply);
        return getGameMetadataEn(root);
    } catch (e) {
        log.error(`Error getting ${id} from ${this.name}`, e);
        return undefined;
    }
}

async function getJapaneseSite(id) {
    try {
        let reply = await request.get({
            method: 'GET',
            uri: `http://www.getchu.com/sp/soft.phtml?id=${id}&gc=gc`,
            encoding: null
        });
        const bodyWithCorrectEncoding = iconv.decode(reply, 'EUC-JP');
        // await files.writeFile(`${id}.html`, bodyWithCorrectEncoding);
        const root = htmlParser.parse(bodyWithCorrectEncoding);
        return getGameMetadataJp(root);
    } catch (e) {
        log.error(`Error getting ${id} from ${this.name}`, e);
        return undefined;
    }
}
