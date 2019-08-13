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
        const progressBar = startProgressBar(
            launchboxPlatform.LaunchBox.Game.length
        );

        for (const [
            index,
            launchboxGame,
        ] of launchboxPlatform.LaunchBox.Game.entries()) {
            const dbGame = await database.game.findOne({
                launchboxId: launchboxGame.ID._text,
            });
            if (dbGame) {
                await syncGame(launchboxGame, dbGame, database);
            }
            progressBar.update(index + 1);
        }
        progressBar.stop();
    }
}

async function syncGame(launchboxGame, dbGame, database) {
    log.debug(`Syncing game ${dbGame.id}`);
    if (
        settings.onlyUpdateNewer &&
        isOlder(launchboxGame.DateModified, dbGame.dateModified) &&
        isOlder(launchboxGame.LastPlayedDate, dbGame.lastPlayedDate)
    ) {
        log.debug('Skipping game due to outdated data in launchbox');
    } else {
        const result = mapper.reverseMap(launchboxGame);

        Object.assign(dbGame, result);

        try {
            await database.game.save(dbGame);
            log.debug(`Game updated with`, JSON.stringify(dbGame, null, 4));
        } catch (e) {
            log.debug('Game failed to be saved', e);
            throw e;
        }
    }
}

function isOlder(launchboxDate, dbGameDate) {
    return dbGameDate
        ? moment(launchboxDate._text).isSameOrBefore(moment(dbGameDate))
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
        const convertedObject = convert.xml2js(launchboxXml, { compact: true });

        if (!convertedObject.LaunchBox.Game) {
            convertedObject.LaunchBox.Game = [];
        } else if (!Array.isArray(convertedObject.LaunchBox.Game)) {
            convertedObject.LaunchBox.Game = [convertedObject.LaunchBox.Game];
        }

        if (!convertedObject.LaunchBox.CustomField) {
            convertedObject.LaunchBox.CustomField = [];
        } else if (!Array.isArray(convertedObject.LaunchBox.CustomField)) {
            convertedObject.LaunchBox.CustomField = [
                convertedObject.LaunchBox.CustomField,
            ];
        }

        return convertedObject;
    }
}

module.exports = syncLaunchboxToDb;
