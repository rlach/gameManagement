const log = require('../../util/logger');
const fs = require('fs');
const executables = require('./find_executable');
const engineRecognizer = require('./recognize_game_engine');
const progress = require('../../util/progress');
const eachLimit = require('async/eachLimit');
const { removeUndefined } = require('../../util/objects');
const { promisify } = require('util');
const regedit = require('regedit');
const asyncRegistryPutValue = promisify(regedit.putValue);

const operation = 'Scanning directories';

async function scanDirectories(database, mainPaths, searchSettings) {
    const progressBar = progress.getBar(operation);

    log.debug(`Reading all main paths`, mainPaths);
    const foundFiles = [];

    for (const path of mainPaths) {
        const singlePathFiles = fs.readdirSync(path).map(name => {
            return {
                name,
                path,
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    await database.game.updateMany(
        { id: { $nin: foundFiles.map(f => f.name) } },
        { deleted: true }
    );

    progressBar.start(foundFiles.length, 0);
    await eachLimit(foundFiles, 5, async file => {
        return scanDirectory(file, database, progressBar, searchSettings);
    });

    progress.updateName(operation);
    progressBar.stop();
}

async function scanDirectory(file, database, progressBar, searchSettings) {
    let game = await database.game.retrieveFromDb(file.name);

    if (isDeleted(file)) {
        if (!game.deleted) {
            game.deleted = true;
            await database.game.save(game);
        }

        return;
    } else if (game.deleted) {
        game.deleted = false;
        await database.game.save(game);
    }

    if (!game.executableFile || game.forceExecutableUpdate) {
        game.forceExecutableUpdate = false;
        Object.assign(
            game,
            removeUndefined(
                await executables.findExecutableAndDirectory(
                    file,
                    searchSettings
                )
            )
        );
        await database.game.save(game);
    }

    if (game.executableFile && !game.engine) {
        game.engine = await engineRecognizer.recognizeGameEngine(file);
        if (game.engine) {
            await database.game.save(game);
        }
    }

    if (game.executableFile && process.platform === 'win32') {
        const valuesToPut = {
            'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers': {
                [game.executableFile]: {
                    value: '~HIGHDPIAWARE',
                    type: 'REG_SZ',
                },
            },
        };

        await asyncRegistryPutValue(valuesToPut);
    }

    progressBar.increment();
}

function isDeleted(file) {
    if (!fs.existsSync(`${file.path}/${file.name}`)) {
        return true;
    }

    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    return subFiles.length === 0 || subFiles.some(f => f === 'DELETED');
}

module.exports = scanDirectories;
