const path = require('path');
const files = require('../../util/files');
const log = require('../../util/logger');
const moment = require('moment/moment');
const fs = require('fs');

async function updateExecutableAndDirectory(file, game, database) {
    if (!game.executableFile || game.forceExecutableUpdate) {
        log.debug('Updating executable path', game.id);
        const executableFile = await findExecutableFile(file);
        game.forceExecutableUpdate = false;
        if (executableFile.deleted) {
            game.deleted = true;
            await database.game.save(game);
        } else {
            await saveFileAndDirectory(executableFile, game, database);
        }
    }
}

async function findExecutableFile(file) {
    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    if (subFiles.length === 0 || subFiles.find(f => f === 'DELETED')) {
        log.debug('Game was deleted', { file });
        return {
            deleted: true,
        };
    } else {
        let executableFile = {
            directory: path.resolve(`${file.path}/${file.name}/${subFiles[0]}`),
        };

        const foundFiles = await files.findExecutables(
            `${file.path}/${file.name}`
        );
        if (foundFiles.length === 0) {
            log.debug(`There is no exe`, { file });
        } else {
            log.debug('Found multiple exe files', foundFiles.map(f => f.file));
            let gameExe = foundFiles.find(t =>
                t.name.toLowerCase().startsWith('game')
            );
            if (!gameExe) {
                gameExe = foundFiles.find(t =>
                    t.name.toLowerCase().endsWith('exe')
                );
            }
            if (!gameExe) {
                gameExe = foundFiles[0];
            }

            log.debug('game exe selected', gameExe);
            executableFile.file = path.resolve(
                `${gameExe.base}/${gameExe.relative}`
            );
        }

        return executableFile;
    }
}

async function saveFileAndDirectory(target, game, database) {
    log.debug(`saving link to executable`, target);
    game.deleted = false;
    game.directory = target.directory;
    game.executableFile = target.file;
    game.dateModified = moment().format();
    await database.game.save(game);
}

module.exports = { updateExecutableAndDirectory };
