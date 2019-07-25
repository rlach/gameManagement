const htmlParser = require('node-html-parser/dist/index');
const request = require('request-promise');
const log = require('./../logger');
const settings = require('./../settings');

class DlsiteStrategy {
    constructor() {
        this.name = 'dlsite';
    }

    async fetchGameData(gameId) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);
        let jpn = {};
        let eng = {};
        if (gameId.startsWith('RJ')) {
            const sites = await Promise.all([getJapaneseSite(gameId), getEnglishSite(gameId)]);
            jpn = sites[0] ? sites[0] : {};
            eng = sites[1] ? sites[1] : {};
        } else if (gameId.startsWith('RE')) {
            const engSite = await getEnglishSite(id);
            eng = engSite ? engSite : {};
        } else if (gameId.startsWith('VJ')) {
            const jpnSite = await getProSite(id);
            jpn = jpnSite ? jpnSite : {};
        } else {
            log.error('Wrong file for strategy', { name: this.name });
            return;
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
        const matches = name.match(/((RE)|(RJ)|(VJ))\d+/gi);
        return matches ? matches.find(matched => matched.length === 8) : '';
    }

    async findGame(name) {
        const reply = await searchJp(name);
        const works = reply.work;
        if (works.length === 0) {
            const reply2 = await searchJp(name.substring(0, name.length / 2));
            return reply2.work;
        } else {
            return works;
        }
    }

    shouldUse(gameId) {
        return gameId.startsWith('RJ') || gameId.startsWith('RE') || gameId.startsWith('VJ');
    }
}

let dlsiteStrategy = new DlsiteStrategy();
module.exports = dlsiteStrategy;

async function searchJp(name) {
    return JSON.parse(
        await request.get({
            uri: `https://www.dlsite.com/suggest/?site=adult-jp&time=${new Date().getTime()}&term=${encodeURIComponent(
                name
            )}`
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
        uri: `https://www.dlsite.com${dlsiteDomain}=/product_id/${encodeURIComponent(id)}.html`
    };
}

function getGameMetadata(root) {
    try {
        let imageSrc = root.querySelector('.slider_item').firstChild.attributes.src;
        if (imageSrc.startsWith('//')) {
            imageSrc = imageSrc.replace('//', 'http://');
        }

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
            image: imageSrc
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
        const reply = await request.get(getOptions(idEn, 'en'));
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.error(`Error getting ${idEn} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message
        });
        return undefined;
    }
}

async function getJapaneseSite(id) {
    try {
        let reply = await request.get(getOptions(id, 'jp'));
        // require('fs').writeFileSync(`./sample/pages/dlsite-${id}.html`, reply);
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.error(`Error getting ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message
        });
        return undefined;
    }
}

async function getProSite(id) {
    try {
        let reply;
        try {
            reply = await request.get(getOptions(id, 'pro'));
        } catch (e) {
            log.debug('Pro does not exist, trying announce', { id });
            reply = await request.get(getOptions(id, 'proAnnounce'));
        }
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        log.error(`Error getting ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message
        });
        return undefined;
    }
}
