const parserStrategies = require('./parsers');
const files = require('./files');
const log = require('./logger');
const { retrieveGameFromDb } = require('./database/game');
const { db, connect } = require('./database/mongoose');
const settings = require('./settings');
const moment = require('moment');

async function main() {
    await connect();

    log.info(`Reading all main paths`, settings.paths.main);
    const foundFiles = [];
    for(const path of settings.paths.main) {
        const singlePathFiles = (await files.readDir(path)).map(name => {
            return {
                name,
                path
            }
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        const strategy = selectStrategy(file.name);

        let game = await retrieveGameFromDb(file.name);
        if (game.shortcutExists && !settings.forceUpdate) {
            log.debug(`Skipping ${file.name}`);
        } else {
            log.debug(`Processing ${file.name}`);
            if ((!game.nameEn && !game.nameJp) || settings.forceUpdate) {
                const gameData = await strategy.fetchGameData(file.name);
                Object.assign(game, gameData);
                game.source = strategy.name;
                game.dateModified = moment().format();
                await game.save();
            }

            const targetPath = await determineTargetPath(file, strategy);
            if (targetPath) {
                const linkName = determineLinkName(file.name, game);
                await makeLink(linkName, targetPath, game);
            }
        }
    }

    db.close();
}

main().catch(e => {
    log.error('Main process crashed', e);
    db.close();
});

function determineLinkName(file, game) {
    const wrongChars = /[\\\/:*?\"<>|]/gi;
    if (game.nameEn || game.nameJp) {
        const name = game.nameEn ? game.nameEn.replace(wrongChars, '') : game.nameJp.replace(wrongChars, '');
        let maker = '';
        try {
            maker = game.makerEn
                ? game.makerEn.replace(wrongChars, '').replace(/ /gi, '_')
                : game.makerJp.replace(wrongChars, '').replace(/ /gi, '_');
        } catch (e) {
            log.info('Unknown maker');
        }
        const genres = game.genresEn
            ? game.genresEn
                  .map(g => g.replace(/ /gi, '_').replace(/\//gi, '+'))
                  .slice(0, 7)
                  .join(' ')
            : '';
        return `${name} [${maker} ${genres}]`;
    } else {
        return file;
    }
}

var path = require('path');

async function determineTargetPath(file) {
    let targetPath;

    const foundFiles = await files.findExecutables(`${file.path}/${file.name}`);
    const subFiles = await files.readDir(`${file.path}/${file.name}`);
    if (subFiles.find(f => f === 'DELETED')) {
        log.info('Game was deleted', { file });
        return;
    } else {
        if (subFiles > 0) {
            targetPath = {
                directory: path.resolve(`${file.path}/${file}/${subFiles[0]}`)
            };
        } else {
            targetPath = {
                directory: path.resolve(`${file.path}/${file}`)
            };
        }
    }

    if (foundFiles.length == 0) {
        log.debug(`There is no exe`, { file });
    } else if (foundFiles.length === 1) {
        log.debug('found only exe', foundFiles[0]);
        targetPath.file = path.resolve(`${foundFiles[0].base}/${foundFiles[0].relative}`);
    } else {
        let gameExe = foundFiles.find(t => t.name.toLowerCase().startsWith('game'));
        if (!gameExe) {
            gameExe = foundFiles.find(t => t.name.toLowerCase().endsWith('exe'));
        }
        if (!gameExe) {
            gameExe = foundFiles[0];
        }

        log.debug('game exe selected', gameExe);
        targetPath.file = path.resolve(`${gameExe.base}/${gameExe.relative}`);
    }

    return targetPath;
}

async function makeLink(name, target, game) {
    log.debug(`making link to target`, target);
    try {
        // await files.createRelativeLink(name, target.file);
        game.directory = target.directory;
        game.executableFile = target.file;
        game.shortcutExists = false;
        game.dateModified = moment().format();
        await game.save();
    } catch (e) {
        log.error(`File ${name} sucks`, e);
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
