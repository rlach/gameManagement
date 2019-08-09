const progress = require('../progress');
const moment = require('moment/moment');
const fs = require('fs');
const log = require('../logger');
const convert = require('xml-js');
const settings = require('../settings');
const mapper = require('../mapper');

async function syncLaunchboxToDb(database) {
    const launchboxPlatform = readLaunchboxPlatformFile();
    if (launchboxPlatform) {
        const progressBar = startProgressBar(launchboxPlatform.LaunchBox.Game.length);

        for (const [index, launchboxGame] of launchboxPlatform.LaunchBox.Game.entries()) {
            const externalGameId = getExternalGameId(launchboxPlatform, launchboxGame);
            if (externalGameId) {
                const dbGame = await database.game.findOne({ id: externalGameId });
                if (dbGame) {
                    await syncGame(launchboxGame, dbGame, database);
                }
            }
            progressBar.update(index + 1);
        }
        progressBar.stop();
    }
}

function getExternalGameId(launchboxPlatform, launchboxGame) {
    let externalGameIdFieldValue;
    if (settings.externalIdField === 'CustomField') {
        const idAdditionalField = launchboxPlatform.LaunchBox.CustomField
            ? launchboxPlatform.LaunchBox.CustomField.find(
                  f => f.Name._text === 'externalId' && f.GameID._text === launchboxGame.ID._text
              )
            : undefined;
        if (!idAdditionalField) {
            log.debug(`Additional field doesn't exist for ${launchboxGame.ID._text}`);
        }
        externalGameIdFieldValue = idAdditionalField.Value._text;
    } else {
        externalGameIdFieldValue = launchboxGame[settings.externalIdField]._text;
    }
    return externalGameIdFieldValue;
}

async function syncGame(launchboxGame, dbGame, database) {
    log.debug(`Syncing game ${dbGame.id}`);
    if (settings.onlyUpdateNewer && isOlder(launchboxGame, dbGame)) {
        log.debug('Skipping game due to outdated data in launchbox');
    } else {
        const result = mapper.reverseMap(launchboxGame);

        Object.assign(dbGame, result);

        try {
            await database.game.saveGame(dbGame);
            log.debug(`Game updated with`, JSON.stringify(dbGame, null, 4));
        } catch (e) {
            log.debug('Game failed to be saved', e);
            throw e;
        }
    }
}

function isOlder(launchboxGame, dbGame) {
    return dbGame.dateModified
        ? moment(launchboxGame.DateModified._text).isSameOrBefore(moment(dbGame.dateModified))
        : false;
}

function startProgressBar(gameAmount) {
    const progressBar = progress.getBar('Syncing launchbox to database');
    progressBar.start(gameAmount, 0);
    return progressBar;
}

function readLaunchboxPlatformFile() {
    const launchboxXmlPath = `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`;
    if (fs.existsSync(launchboxXmlPath)) {
        const launchboxXml = fs.readFileSync(launchboxXmlPath, 'utf8');
        return convert.xml2js(launchboxXml, { compact: true });
    }
}

module.exports = syncLaunchboxToDb;
