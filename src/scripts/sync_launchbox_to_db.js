const cliProgress = require('cli-progress');
const moment = require('moment/moment');
const fs = require('fs');
const log = require('../logger');
const {db, connect} = require('../database/mongoose');
const {findOne, saveGame} = require('../database/game');
const convert = require('xml-js');
const settings = require('../settings');
const mapper = require('../mapper');

async function syncLaunchboxToDb() {
    if (!fs.existsSync(`${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`)) {
        log.info('Launchbox xml does not exist yet');
        return;
    }

    const progressBar = new cliProgress.Bar(
        {
            format: 'Syncing launchbox to database [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} games'
        },
        cliProgress.Presets.shades_classic
    );

    await connect();
    const launchboxXml = fs.readFileSync(
        `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`,
        'utf8'
    );
    const convertedObject = convert.xml2js(launchboxXml, {compact: true});
    log.debug('Found games', convertedObject.LaunchBox.Game.length);

    progressBar.start(convertedObject.LaunchBox.Game.length, 0);
    for (const [index, launchboxGame] of convertedObject.LaunchBox.Game.entries()) {
        let externalGameIdFieldValue;
        if (settings.externalIdField === 'CustomField') {
            const idAdditionalField = convertedObject.LaunchBox.CustomField
                ? convertedObject.LaunchBox.CustomField.find(
                    f => f.Name._text === 'externalId' && f.GameID._text === launchboxGame.ID._text
                )
                : undefined;
            if (!idAdditionalField) {
                log.debug(`Additional field doesn't exist for ${launchboxGame.ID._text}`);
                continue;
            }
            externalGameIdFieldValue = idAdditionalField.Value._text;
        } else {
            externalGameIdFieldValue = launchboxGame[settings.externalIdField]._text;
        }
        const dbGame = await findOne({id: externalGameIdFieldValue});
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
                const result = mapper.reverseMap(launchboxGame);

                Object.assign(dbGame, result);

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
