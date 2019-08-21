const path = require('path');
const files = require('../../util/files');
const log = require('../../util/logger');
const fs = require('fs');

async function updateExecutableAndDirectory(
    file,
    game,
    searchSettings,
    database
) {
    const executableFile = await findExecutableFile(file, searchSettings);
    game.forceExecutableUpdate = false;
    await saveFileAndDirectory(executableFile, game, database);
}

async function findExecutableFile(file, searchSettings) {
    let executableFile = {
        directory: path.resolve(`${file.path}/${file.name}`),
    };

    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    if (subFiles.length > 0) {
        executableFile.directory = path.resolve(
            `${file.path}/${file.name}/${subFiles[0]}`
        );

        const foundFiles = await files.findByFilter(
            `${file.path}/${file.name}`,
            f => {
                const matcher = f.matcher.toLowerCase();
                return (
                    hasProperExtension(
                        matcher,
                        searchSettings.executableExtensions
                    ) && !isBanned(matcher, searchSettings.bannedFilenames)
                );
            },
            searchSettings.maxSearchDepth
        );
        if (foundFiles.length > 0) {
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
    }

    return executableFile;
}

async function saveFileAndDirectory(target, game, database) {
    log.debug(`saving link to executable`, target);
    game.deleted = false;
    game.directory = target.directory;
    game.executableFile = target.file;
    await database.game.save(game);
}

module.exports = { updateExecutableAndDirectory };

function hasProperExtension(fileName, executableExtensions) {
    return (
        executableExtensions.findIndex(extension =>
            fileName.toLowerCase().endsWith(extension)
        ) > -1
    );
}

function isBanned(fileName, bannedFilenames) {
    return (
        bannedFilenames.findIndex(bannedName =>
            fileName.toLowerCase().includes(bannedName)
        ) > -1
    );
}
