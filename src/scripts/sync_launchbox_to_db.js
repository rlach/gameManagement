const cliProgress = require('cli-progress');
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

    const progressBar = new cliProgress.Bar({
        format: 'Syncing launchbox to database [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} games'
    }, cliProgress.Presets.shades_classic);

    await connect();
    const launchboxXml = fs.readFileSync(
        `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`,
        'utf8'
    );
    const convertedObject = convert.xml2js(launchboxXml, { compact: true });
    log.debug('Found games', convertedObject.LaunchBox.Game.length);

    progressBar.start(convertedObject.LaunchBox.Game.length, 0);
    for (const [index, launchboxGame] of convertedObject.LaunchBox.Game.entries()) {
        let externalGameIdFieldValue;
        if(settings.externalIdField === 'CustomField') {
            const idAdditionalField = convertedObject.LaunchBox.CustomField.find(f => f.Name._text === 'externalId' && f.GameID._text === launchboxGame.ID._text);
            if(!idAdditionalField) {
                log.debug(`Additional field doesn't exist for ${launchboxGame.ID._text}`);
                continue;
            }
            externalGameIdFieldValue = idAdditionalField.Value._text;
        } else {
            externalGameIdFieldValue = launchboxGame[settings.externalIdField]._text;
        }
        const dbGame = await findOne({ id: externalGameIdFieldValue });
        if (!dbGame) {
            log.debug(`Game ${externalGameIdFieldValue} does not exist in db`);
        } else {
            log.debug(`Syncing game ${externalGameIdFieldValue}`);
            if (
                settings.onlyUpdateNewer &&
                dbGame.dateModified &&
                moment(dbGame.dateModified).isSameOrAfter(moment(launchboxGame.DateModified._text))
            ) {
                log.debug('Skipping game due to outdated data in launchbox');
            } else {
                let update;
                /* We don't know in what language user manually added data
                   so lets just use the preference here
                   Also, we only allow to update fields that are currently empty
                   With exception of genres, which we allow to edit with no issues*/
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
                    log.debug('Game failed to be saved', e);
                }
            }
        }
        progressBar.update(index + 1);
    }
    progressBar.stop();

    await db.close();
}

module.exports = syncLaunchboxToDb;
