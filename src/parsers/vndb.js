const VNDB = require('vndb');
const VNDBtags = require('./vndb-tags');
const log = require('../logger');
const moment = require('moment');

let vndb;

async function connect() {
    if (!vndb) {
        vndb = await VNDB.start();
        await vndb.write('login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}');
    }

    return vndb;
}

async function disconnect() {
    if (vndb) {
        await vndb.end();
        delete vndb;
    }
}

async function getVndbData(name) {
    let improvedName = name.replace(/\(([^)]+)\)/g, ''); //remove ()
    improvedName = improvedName.replace(/（([^)]+)）/g, ''); //remove japanese ()
    improvedName = improvedName.replace(/・/g, ''); // replace bad characters
    log.debug('Improved name', improvedName);
    try {
        let foundVNs = JSON.parse(
            (await vndb.write(`get vn basic,details,tags (search~"${improvedName}")`))
                .replace('results ', '')
                .replace('error ', '')
        );

        if (foundVNs.id === 'throttled') {
            throw foundVNs;
        }

        let VN;
        if (foundVNs.num > 0) {
            VN = foundVNs.items[0];
        } else {
            return undefined;
        }

        const tags = VN.tags
            .filter(tag => tag[1] > 1)
            .map(tag => {
                const foundTag = VNDBtags.find(t => t.id === tag[0]);
                return foundTag ? foundTag : '';
            })
            .filter(tag => tag !== '');

        log.debug('About to return VN');
        return {
            nameEn: VN.title,
            releaseDate: moment(VN.released, 'YYYY-MM-DD').format(),
            descriptionEn: VN.description,
            genresEn: tags.filter(t => t.cat === 'ero').map(t => t.name),
            tagsEn: tags.filter(t => t.cat === 'tech').map(t => t.name),
            imageUrlEn: VN.image
        };
    } catch (e) {
        if (e.id === 'throttled') {
            let timeout = e.fullwait ? e.fullwait * 1000 : 30000;
            log.debug(`reached max vndb api usage, waiting ${timeout / 1000} seconds`);
            await sleep(timeout);
            return await getVndbData(name);
        }
        log.error('Something happened when connecting to VNDB API', e);
    }

    return undefined;
}

const sleep = milliseconds => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

module.exports = { getVndbData, connect, disconnect };
