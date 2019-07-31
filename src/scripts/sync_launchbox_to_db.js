const moment = require('moment/moment');
const fs = require('fs');
const log = require('../logger');
const { db, connect } = require('../database/mongoose');
const { findOne, saveGame } = require('../database/game');
const convert = require('xml-js');
const settings = require('../settings');

async function syncLaunchboxToDb() {
    if (!fs.existsSync(`${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`)) {
        log.info('Launchbox xml does not exist yet');
        return;
    }

    await connect();
    const launchboxXml = fs.readFileSync(
        `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`,
        'utf8'
    );
    const convertedObject = convert.xml2js(launchboxXml, { compact: true });
    log.debug('Found games', convertedObject.LaunchBox.Game.length);

    for (const launchboxGame of convertedObject.LaunchBox.Game) {
        const dbGame = await findOne({ id: launchboxGame.SortTitle._text });
        if (!dbGame) {
            log.debug(`Game ${launchboxGame.SortTitle._text} does not exist in db`);
        } else {
            log.debug(`Syncing game ${launchboxGame.SortTitle._text}`);
            if (
                settings.onlyUpdateNewer &&
                dbGame.dateModified &&
                moment(dbGame.dateModified).isSameOrBefore(moment(launchboxGame.DateModified._text))
            ) {
                log.debug('Skipping game due to outdated data in launchbox');
            } else {
                let update;
                // We don't know in what language user manually added data
                // so lets just use the preference here
                // Also, we only allow to update fields that are currently empty
                // With exception of genres, which we allow to edit with no issues
                if (settings.preferredLanguage === 'en') {
                    update = {
                        nameEn: dbGame.nameEn ? dbGame.nameEn : launchboxGame.Title._text,
                        descriptionEn: dbGame.descriptionEn ? dbGame.descriptionEn : launchboxGame.Notes._text,
                        genresEn: launchboxGame.Genre._text ? launchboxGame.Genre._text.split(';') : dbGame.genresEn,
                        makerEn: dbGame.makerEn ? dbGame.makerEn : launchboxGame.Developer._text
                    };
                } else {
                    update = {
                        nameJp: dbGame.nameJp ? dbGame.nameJp : launchboxGame.Title._text,
                        descriptionJp: dbGame.descriptionJp ? dbGame.descriptionJp : launchboxGame.Notes._text,
                        genresJp: launchboxGame.Genre._text ? launchboxGame.Genre._text.split(';') : dbGame.genresJp,
                        makerJp: dbGame.makerJp ? dbGame.makerJp : launchboxGame.Developer._text
                    };
                }

                Object.assign(update, {
                    completed: launchboxGame.Completed._text === 'true',
                    dateAdded: launchboxGame.DateAdded._text,
                    dateModified: launchboxGame.DateModified._text,
                    releaseDate: launchboxGame.ReleaseDate._text,
                    favorite: launchboxGame.Favorite._text === 'true',
                    rating: launchboxGame.Rating._text ? Number.parseInt(launchboxGame.Rating._text) : undefined,
                    stars: Number.parseFloat(launchboxGame.StarRatingFloat._text),
                    version: launchboxGame.Version._text,
                    series: launchboxGame.Series._text,
                    portable: launchboxGame.Portable._text === 'true',
                    hide: launchboxGame.Hide._text === 'true',
                    broken: launchboxGame.Broken._text === 'true',
                    executableFile: launchboxGame.ApplicationPath._text,
                    directory: launchboxGame.RootFolder._text
                });

                Object.assign(dbGame, update);

                try {
                    await saveGame(dbGame);
                    log.debug(`Game updated with`, JSON.stringify(dbGame, null, 4));
                } catch (e) {
                    log.warn('Game failed to be saved', e);
                }
            }
        }
    }

    await db.close();
}

module.exports = syncLaunchboxToDb;
