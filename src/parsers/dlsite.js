const htmlParser = require('node-html-parser/dist/index');
const request = require('request-promise');
const log = require('./../logger');
const settings = require('./../settings');

class DlsiteStrategy {
    constructor() {
        this.pathName = settings.paths.dlsite;
    }

    async fetchGameData(gameId) {
        log.debug(`Fetching game ${gameId}`);
        const sites = await Promise.all([getSite(gameId), getEnglishSite(gameId)]);
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

    shouldUse(gameId) {
        return gameId.startsWith('RJ') || gameId.startsWith('RE') || gameId.startsWith('VJ');
    }
}

let dlsiteStrategy = new DlsiteStrategy();
module.exports = dlsiteStrategy;

function getOptions(id) {
    return {
        method: 'GET',
        uri: `https://www.dlsite.com/maniax/work/=/product_id/${id}.html`
    };
}

function getOptionsEn(id) {
    return {
        method: 'GET',
        uri: `https://www.dlsite.com/ecchi-eng/work/=/product_id/${id}.html`
    };
}

function getGameMetadata(root) {
    try {
        return {
            name: root.querySelector('#work_name').text.trim(),
            description: root.querySelector('.work_article').text.trim(),
            genres: root
                .querySelector('.main_genre')
                .childNodes.map(node => node.text.trim())
                .filter(n => n !== ''),
            tags: root
                .querySelector('.work_genre')
                .childNodes.map(node => node.text.trim())
                .filter(n => n !== ''),
            maker: root.querySelector('.maker_name').text.trim(),
            image: root.querySelector('.slider_item').firstChild.attributes.src
        };
    } catch (e) {
        log.error('Metadata parsing failure', e);
    }
}

async function getEnglishSite(id) {
    if (id.startsWith('VJ')) {
        return undefined;
    }

    const idEn = id.replace('RJ', 'RE');

    try {
        const reply = await request.get(getOptionsEn(idEn));
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.error(`Error getting ${idEn}`, e);
        return undefined;
    }
}

async function getSite(id) {
    try {
        let reply;
        try {
            reply = await request.get(getOptions(id));
        } catch (e) {
            reply = await request.get({
                method: 'GET',
                uri: `https://www.dlsite.com/pro/announce/=/product_id/${id}.html`
            });
        }
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.error(`Error getting ${id}`, e);
        return undefined;
    }
}
