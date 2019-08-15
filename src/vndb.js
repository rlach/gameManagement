const VNDB = require('vndb');
const VNDBtags = require('./assets/vndb-tags');
const log = require('./logger');
const moment = require('moment/moment');
const sleep = require('./util/sleep');

let vndb;

async function connect() {
    if (!vndb) {
        vndb = await VNDB.start();
        await vndb.write(
            'login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}'
        );
    }

    return vndb;
}

async function disconnect() {
    if (vndb) {
        await vndb.end();
    }
}

async function findVnsBasic(query) {
    return makeVndbQuery(`get vn basic ${query}`);
}

async function findVns(query) {
    return makeVndbQuery(`get vn basic,details,tags,screens,stats ${query}`);
}

async function findReleases(query) {
    return makeVndbQuery(`get release basic,producers ${query}`);
}

async function makeVndbQuery(query) {
    const results = JSON.parse(
        (await vndb.write(query)).replace('results ', '').replace('error ', '')
    );

    if (results.id === 'throttled') {
        throw results;
    } else {
        return results;
    }
}

async function getVndbDataById(id, previousFoundVNs) {
    let foundVNs = undefined;
    try {
        foundVNs = previousFoundVNs
            ? previousFoundVNs
            : await findVns(`(id=${id})`);
        let foundReleases = await findReleases(`(vn=${id})`);
        let results = undefined;
        if (foundVNs.num > 0) {
            results = {
                ...getMetadataFromVn(foundVNs.items[0]),
                nameJp: foundVNs.items[0].original,
            };
        }
        if (results && foundReleases.num > 0) {
            const release = foundReleases.items.find(
                r =>
                    r.type === 'complete' &&
                    r.producers.some(p => p.developer === true)
            );
            if (release) {
                const developer = release.producers.find(
                    p => p.developer == true
                );
                results.makerEn = developer.name;
                results.makerJp = developer.original;
            }
        }
        return results;
    } catch (e) {
        const retry = await handleThrottle(e);
        if (retry) {
            return await getVndbDataById(name, foundVNs);
        }
    }
}

async function getVndbData(name) {
    let improvedName = name.replace(/\(([^)]+)\)/g, ''); //remove ()
    improvedName = improvedName.replace(/（([^)]+)）/g, ''); //remove japanese ()
    improvedName = improvedName.replace(/・/g, ''); // replace bad characters
    log.debug('Improved name', improvedName);
    try {
        let foundVNs = await findVns(`(search~"${improvedName}")`);

        let VN;
        if (foundVNs.num > 0) {
            VN = foundVNs.items.find(
                vn => vn.title === improvedName || vn.original === improvedName
            );
            if (!VN) {
                VN = foundVNs.items.find(
                    vn =>
                        vn.title.includes(improvedName) ||
                        improvedName.includes(vn.title)
                );
            }
            if (!VN) {
                VN = foundVNs.items[0];
            }
        } else {
            return undefined;
        }

        return getMetadataFromVn(VN);
    } catch (e) {
        const retry = await handleThrottle(e);
        if (retry) {
            return await getVndbData(name);
        }
    }

    return undefined;
}

async function findVndbGames(name) {
    try {
        let foundVNs = await findVnsBasic(`(search~"${name}")`);

        return foundVNs.items.map(i => ({
            workno: `v${i.id}`,
            work_name: i.original ? i.original : i.title,
        }));
    } catch (e) {
        const retry = await handleThrottle(e);
        if (retry) {
            return await findVndbGames(name);
        }
    }
}

async function handleThrottle(e) {
    if (e.id === 'throttled') {
        let timeout = e.fullwait ? e.fullwait * 1000 : 30000;
        log.debug(
            `reached max vndb api usage, waiting ${timeout / 1000} seconds`
        );
        await sleep(timeout);
        return true;
    }
    log.error('Something happened when connecting to VNDB API', e);
    return false;
}

function getMetadataFromVn(VN) {
    const tags = VN.tags
        .filter(tag => tag[1] > 1)
        .map(tag => {
            const foundTag = VNDBtags.find(t => t.id === tag[0]);
            return foundTag ? foundTag : '';
        })
        .filter(tag => tag !== '');

    return {
        nameEn: VN.title,
        releaseDate: moment(VN.released, 'YYYY-MM-DD').format(),
        descriptionEn: VN.description,
        genresEn: tags.filter(t => t.cat === 'ero').map(t => t.name),
        tagsEn: tags.filter(t => t.cat === 'tech').map(t => t.name),
        imageUrlEn: VN.image,
        additionalImages: VN.screens.map(s => s.image),
        communityStarVotes: VN.votecount,
        communityStars: VN.rating / 2,
    };
}

module.exports = {
    getVndbData,
    getVndbDataById,
    findVndbGames,
    connect,
    disconnect,
};
