const progress = require('../util/progress');
const moment = require('moment/moment');
const fs = require('fs');
const log = require('../util/logger');
const convert = require('xml-js');
const mapper = require('../util/mapper');
const { ensureArray } = require('../util/objects');

async function syncLaunchboxToDb(
    launchboxPath,
    launchboxPlatformName,
    onlyUpdateNewer,
    database
) {
    const launchboxPlatform = readLaunchboxPlatformFile(
        launchboxPath,
        launchboxPlatformName
    );
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
            if (shouldSkipGame(launchboxGame, dbGame, onlyUpdateNewer)) {
                log.debug('Skipping game due to outdated data in launchbox');
            } else {
                log.debug(`Syncing game ${dbGame.id}`);
                await syncGame(launchboxGame, dbGame, database);
            }
            progressBar.update(index + 1);
        }
        progressBar.stop();
    }
}

function shouldSkipGame(launchboxGame, dbGame, onlyUpdateNewer) {
    return (
        !dbGame ||
        (onlyUpdateNewer &&
            isOlder(launchboxGame.DateModified, dbGame.dateModified) &&
            isOlder(launchboxGame.LastPlayedDate, dbGame.lastPlayedDate))
    );
}

async function syncGame(launchboxGame, dbGame, database) {
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

function readLaunchboxPlatformFile(launchboxPath, launchboxPlatformName) {
    const launchboxXmlPath = `${launchboxPath}/Data/Platforms/${launchboxPlatformName}.xml`;
    if (fs.existsSync(launchboxXmlPath)) {
        const launchboxXml = fs.readFileSync(launchboxXmlPath, 'utf8');
        const convertedObject = convert.xml2js(launchboxXml, { compact: true });

        if (!convertedObject.LaunchBox) {
            throw new Error('Not a launchbox file');
        }

        convertedObject.LaunchBox.Game = ensureArray(
            convertedObject.LaunchBox.Game
        );

        return convertedObject;
    }
}

module.exports = syncLaunchboxToDb;
