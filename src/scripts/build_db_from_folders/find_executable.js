const path = require('path');
const databaseGame = require('../../database/database').game;
const files = require('../../files');
const log = require('../../logger');
const moment = require('moment/moment');
const fs = require('fs');

async function updateExecutableAndDirectory(file, game, strategy) {
    if (!game.executableFile || game.forceExecutableUpdate) {
        log.debug('Updating executable path', game.id);
        const executableFile = await findExecutableFile(file, strategy);
        game.forceExecutableUpdate = false;
        if (executableFile.deleted) {
            game.deleted = true;
            await databaseGame.saveGame(game);
        } else {
            await saveFileAndDirectory(executableFile, game);
        }
    }
}

async function findExecutableFile(file) {
    let executableFile;

    const foundFiles = await files.findExecutables(`${file.path}/${file.name}`);
    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    if (subFiles.length === 0 || subFiles.find(f => f === 'DELETED')) {
        log.debug('Game was deleted', {file});
        return {
            deleted: true
        };
    } else {
        if (subFiles > 0) {
            executableFile = {
                directory: path.resolve(`${file.path}/${file.name}/${subFiles[0]}`)
            };
        } else {
            executableFile = {
                directory: path.resolve(`${file.path}/${file.name}`)
            };
        }
    }

    if (foundFiles.length === 0) {
        log.debug(`There is no exe`, {file});
    } else if (foundFiles.length === 1) {
        log.debug('Found single exe file', foundFiles[0].file);
        executableFile.file = path.resolve(`${foundFiles[0].base}/${foundFiles[0].relative}`);
    } else {
        log.debug('Found multiple exe files', foundFiles.map(f => f.file));
        let gameExe = foundFiles.find(t => t.name.toLowerCase().startsWith('game'));
        if (!gameExe) {
            gameExe = foundFiles.find(t => t.name.toLowerCase().endsWith('exe'));
        }
        if (!gameExe) {
            gameExe = foundFiles[0];
        }

        log.debug('game exe selected', gameExe);
        executableFile.file = path.resolve(`${gameExe.base}/${gameExe.relative}`);
    }

    return executableFile;
}

async function saveFileAndDirectory(target, game) {
    try {
        log.debug(`saving link to executable`, target);
        game.deleted = false;
        game.directory = target.directory;
        game.executableFile = target.file;
        game.dateModified = moment().format();
        await databaseGame.saveGame(game);
    } catch (e) {
        log.debug(`Could not update game`, e);
    }
}

module.exports = { updateExecutableAndDirectory };