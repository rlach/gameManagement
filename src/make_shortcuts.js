const parserStrategies = require('./parsers');
const files = require('./files');
const log = require('./logger');
const {retrieveGame} = require('./database/game');
const {db, connect} = require('./database/mongoose');

const mainPath = `J:/!NEWORDER/DLSITE`;

async function main() {
    await connect();

    log.info(`Reading ${mainPath}`);
    const foundFiles = await files.readDir(mainPath);

    for (const file of foundFiles) {
        const strategy = selectStrategy(file);

        let game = await retrieveGame(file);
        if (game.shortcutExists) {
            log.debug(`Skipping ${file}`);
        } else {
            log.debug(`Processing ${file}`);
            if (!game.nameEn && !game.nameJp) {
                const gameData = await strategy.fetchGameData(file);
                Object.assign(game, gameData);
                await game.save();
            }

            const targetPath = await determineTargetPath(file, strategy);
            if (targetPath) {
                const linkName = determineLinkName(file, game);
                await makeLink(linkName, targetPath, game);
            }
        }
    }
}

main()
    .catch(e => log.error('Main process crashed', e))
    .finally(() => db.close());

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
            ? game.genresEn.map(g => g.replace(/ /gi, '_').replace(/\//gi, '+')).join(' ')
            : '';
        return `${name} [${maker} ${genres}]`;
    } else {
        return file;
    }
}

async function determineTargetPath(file, strategy) {
    let targetPath;

    const foundFiles = await files.findExecutables(`${mainPath}/${file}`);
    if (foundFiles.length == 0) {
        log.debug(`There is no exe`, {file});
        const subFiles = await files.readDir(`${mainPath}/${file}`);
        if (subFiles.find(f => f === 'DELETED')) {
            log.info('Game was deleted', {file});
            return;
        } else {
            if (subFiles > 0) {
                targetPath = `${file}\\${subFiles[0]}`;
            } else {
                targetPath = `${file}`;
            }
        }
    } else if (foundFiles.length === 1) {
        targetPath = `${file}\\${foundFiles[0].relative}`;
    } else {
        let gameExe = foundFiles.find(t => t.name.toLowerCase().startsWith('game'));
        if (!gameExe) {
            gameExe = foundFiles.find(t => t.name.toLowerCase().endsWith('exe'));
        }
        if (!gameExe) {
            gameExe = foundFiles[0];
        }

        targetPath = `${file}\\${gameExe.relative}`;
    }

    targetPath = targetPath ? `..\\${strategy.pathName}\\${targetPath}` : undefined;

    return targetPath;
}

async function makeLink(name, target, game) {
    log.debug(`making link to ${target}`);
    try {
        await files.createRelativeLink(name, target);
        game.shortcutExists = true;
        await game.save();
    } catch (e) {
        log.error(`File ${name} sucks`, e);
    }
}

function selectStrategy(gameId) {
    let strategies = Object.keys(parserStrategies);
    for (const strategy in strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }

    return strategies[0];
}
