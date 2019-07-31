const parserStrategies = require('../parsers');
const files = require('../files');
const log = require('../logger');
const { retrieveGameFromDb } = require('../database/game');
const { db, connect } = require('../database/mongoose');
const settings = require('../settings');
const moment = require('moment/moment');
const fs = require('fs');
const vndb = require('../parsers/vndb');

async function buildDbFromFolders() {
    await connect();
    await vndb.connect();

    log.info(`Reading all main paths`, settings.paths.main);
    const foundFiles = [];
    for (const path of settings.paths.main) {
        const singlePathFiles = fs.readdirSync(path).map(name => {
            return {
                name,
                path
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        const strategy = selectStrategy(file.name);

        let game = await retrieveGameFromDb(file.name);
        if (game.executableFile && !game.forceSourceUpdate && !game.forceExecutableUpdate && !game.forceAdditionalImagesUpdate) {
            log.debug(`Skipping ${file.name}`);
        } else {
            log.debug(`Processing ${file.name}`);
            if ((!game.nameEn && !game.nameJp) || game.forceSourceUpdate) {
                game.forceSourceUpdate = false;
                log.debug('Updating source web page(s)');
                const gameData = await strategy.fetchGameData(file.name);
                if(gameData.nameJp || gameData.nameEn) {
                    gameData.additionalImages = await strategy.getAdditionalImages(file.name);
                }
                Object.assign(game, removeUndefined(gameData));
                game.source = strategy.name;
                game.dateModified = moment().format();
                await game.save();
            } else if((game.nameEn || game.nameJp) && game.forceAdditionalImagesUpdate) {
                game.forceAdditionalImagesUpdate = false;
                game.additionalImages = await strategy.getAdditionalImages(file.name);
                await game.save();
            }

            if (!game.executableFile || game.forceExecutableUpdate) {
                log.info('Updating executable path', game.id);
                const executableFile = await findExecutableFile(file, strategy);
                game.forceExecutableUpdate = false;
                if (executableFile.deleted) {
                    game.deleted = true;
                    await game.save();
                } else {
                    await saveFileAndDirectory(executableFile, game);
                }
            }
        }
    }

    db.close();
}

var path = require('path');

async function findExecutableFile(file) {
    let executableFile;

    const foundFiles = await files.findExecutables(`${file.path}/${file.name}`);
    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    if (subFiles.length === 0 || subFiles.find(f => f === 'DELETED')) {
        log.info('Game was deleted', { file });
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

    if (foundFiles.length == 0) {
        log.debug(`There is no exe`, { file });
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
        await game.save();
    } catch (e) {
        log.error(`Could not update game`, e);
    }
}

function selectStrategy(gameId) {
    let strategies = Object.values(parserStrategies);
    for (const strategy of strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }

    return strategies[0];
}

module.exports = buildDbFromFolders;

function removeUndefined(obj) {
    for (let k in obj) if (obj[k] === undefined) delete obj[k];
    return obj;
}