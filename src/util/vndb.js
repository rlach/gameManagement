const VNDB = require('vndb');
const VNDBtags = require('../assets/vndb-tags');
const log = require('./logger');
const moment = require('moment/moment');
const sleep = require('./sleep');
const { removeTagsAndMetadata } = require('./files');

class vndb {
    constructor() {}

    async connect() {
        if (!this.vndb) {
            this.vndb = await VNDB.start();
            await this.vndb.write(
                'login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}'
            );
        }

        return this.vndb;
    }

    async disconnect() {
        if (this.vndb) {
            await this.vndb.end();
            delete this.vndb;
        }
    }

    async getVNById(id, previousFoundVNs) {
        if (!this.vndb) {
            throw new Error('VNDB not connected');
        }

        let foundVNs = undefined;
        try {
            foundVNs = previousFoundVNs
                ? previousFoundVNs
                : await findVns(`(id=${id})`);
            let foundReleases = await findReleases(`(vn=${id})`);
            let results = {};
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
            await handleThrottle(e);
            return await this.getVNById(id, foundVNs);
        }
    }

    async getVNByName(name) {
        if (!this.vndb) {
            throw new Error('VNDB not connected');
        }

        let improvedName = removeTagsAndMetadata(name);
        try {
            let foundVNs = await findVns(`(search~"${improvedName}")`);

            if (foundVNs.num > 0) {
                let VN = foundVNs.items.find(
                    vn =>
                        vn.title === improvedName ||
                        vn.original === improvedName
                );
                if (!VN) {
                    VN = foundVNs.items.find(
                        vn =>
                            vn.title.includes(improvedName) ||
                            improvedName.includes(vn.title) ||
                            vn.original.includes(improvedName) ||
                            improvedName.includes(vn.original)
                    );
                }
                if (!VN) {
                    VN = foundVNs.items[0];
                }

                return getMetadataFromVn(VN);
            }
        } catch (e) {
            await handleThrottle(e);
            return await this.getVNByName(name);
        }

        return undefined;
    }

    async findVNsByName(name) {
        if (!this.vndb) {
            throw new Error('VNDB not connected');
        }

        try {
            let foundVNs = await findVnsBasic(`(search~"${name}")`);

            return foundVNs.num > 0
                ? foundVNs.items.map(i => ({
                      workno: `v${i.id}`,
                      work_name: i.original ? i.original : i.title,
                  }))
                : [];
        } catch (e) {
            await handleThrottle(e);
            return await this.findVNsByName(name);
        }
    }
}

const vndbInstance = new vndb();

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
    const response = await vndbInstance.vndb.write(query);

    const results = JSON.parse(
        response.replace('results ', '').replace('error ', '')
    );
    if (response.startsWith('error')) {
        throw results;
    } else {
        return results;
    }
}

async function handleThrottle(e) {
    if (e.id === 'throttled') {
        let timeout = e.fullwait
            ? e.fullwait * 1000 /* istanbul ignore next */
            : 30000;
        log.debug(
            `reached max vndb api usage, waiting ${timeout / 1000} seconds`
        );
        await sleep(timeout);
    } else {
        log.error('Something happened when communicating with VNDB API', e);
        throw e;
    }
}

function getMetadataFromVn(VN) {
    const tags = VN.tags
        ? VN.tags
              .filter(tag => tag[1] > 1)
              .map(tag => {
                  const foundTag = VNDBtags.find(t => t.id === tag[0]);
                  return foundTag ? foundTag : '';
              })
              .filter(tag => tag !== '')
        : [];

    return {
        nameEn: VN.title,
        releaseDate: moment(VN.released, 'YYYY-MM-DD').format(),
        descriptionEn: VN.description,
        genresEn: tags.filter(t => t.cat === 'ero').map(t => t.name),
        tagsEn: tags.filter(t => t.cat === 'tech').map(t => t.name),
        imageUrlEn: VN.image,
        additionalImages: VN.screens ? VN.screens.map(s => s.image) : [],
        communityStarVotes: VN.votecount,
        communityStars: VN.rating / 2,
    };
}

module.exports = vndbInstance;
