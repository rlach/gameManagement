const cliProgress = require('cli-progress');
const moment = require('moment/moment');
const fs = require('fs');
const log = require('../logger');
const { db, connect } = require('../database/mongoose');
const { findOne, saveGame } = require('../database/game');
const convert = require('xml-js');
const settings = require('../settings');
const mapper = require('../mapper');

async function syncLaunchboxToDb() {
    const launchboxPlatform = readLaunchboxPlatformFile();
    if (launchboxPlatform) {
        const progressBar = startProgressBar(launchboxPlatform.LaunchBox.Game.length);
        await connect();

        for (const [index, launchboxGame] of launchboxPlatform.LaunchBox.Game.entries()) {
            const externalGameId = getExternalGameId(launchboxPlatform, launchboxGame);
            if (externalGameId) {
                const dbGame = await findOne({ id: externalGameId });
                if (dbGame) {
                    await syncGame(launchboxGame, dbGame);
                }
            }
            progressBar.update(index + 1);
        }
        progressBar.stop();

        await db.close();
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

async function syncGame(launchboxGame, dbGame) {
    log.debug(`Syncing game ${dbGame.id}`);
    if (settings.onlyUpdateNewer && isOlder(launchboxGame, dbGame)) {
        log.debug('Skipping game due to outdated data in launchbox');
    } else {
        const result = mapper.reverseMap(launchboxGame);

        Object.assign(dbGame, result);

        try {
            await saveGame(dbGame);
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
    const progressBar = new cliProgress.Bar(
        {
            format: 'Syncing launchbox to database [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} games'
        },
        cliProgress.Presets.shades_classic
    );
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
