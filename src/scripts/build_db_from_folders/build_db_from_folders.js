const cliProgress = require('cli-progress');
const parserStrategies = require('../../parsers');
const files = require('../../files');
const log = require('../../logger');
const {retrieveGameFromDb, updateMany} = require('../../database/game');
const {db, connect} = require('../../database/mongoose');
const settings = require('../../settings');
const moment = require('moment/moment');
const fs = require('fs');
const vndb = require('../../vndb');
const {removeUndefined} = require('../../objects');
const {saveGame} = require('../../database/game');
const { updateExecutableAndDirectory, findExecutableFile  } = require('./find_executable');
const recognizeGameType = require('./recognize_game_type');

async function buildDbFromFolders() {
    const progressBar = new cliProgress.Bar(
        {
            format: 'Building database from folders [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} games'
        },
        cliProgress.Presets.shades_classic
    );
    await connect();
    await vndb.connect();

    log.debug(`Reading all main paths`, settings.paths.main);
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

    await updateMany({id: {$nin: foundFiles.map(f => f.name)}}, {deleted: true});

    progressBar.start(foundFiles.length, 0);
    for (const [index, file] of foundFiles.entries()) {
        const strategy = selectStrategy(file.name);
        if (!strategy) {
            log.debug('No strategy for file', file);
            continue;
        }

        let game = await retrieveGameFromDb(file.name);
        if (!game.engine) {
            game.engine = await recognizeGameType(file);
            if(game.engine) {
                game.dateModified = moment().format();
                await saveGame(game);
            }
        }
        if (game.deleted) {
            const executableFile = await findExecutableFile(file);
            if(!executableFile.deleted) {
                game.deleted = false;
                game.dateModified = moment().format();
                await saveGame(game);
            }
        }
        if (
            game.executableFile &&
            !game.forceSourceUpdate &&
            !game.forceExecutableUpdate &&
            !game.forceAdditionalImagesUpdate &&
            game.status !== 'invalid'
        ) {
            log.debug(`Skipping ${file.name}`);
        } else {
            log.debug(`Processing ${file.name}`);
            if ((!game.nameEn && !game.nameJp) || game.forceSourceUpdate || game.status === 'invalid') {
                game.forceSourceUpdate = false;
                log.debug('Updating source web page(s)');
                const gameData = await strategy.fetchGameData(file.name);
                if (
                    (gameData.nameJp || gameData.nameEn) &&
                    (!gameData.additionalImages || gameData.additionalImages.length === 0)
                ) {
                    gameData.additionalImages = await strategy.getAdditionalImages(file.name);
                }
                Object.assign(game, removeUndefined(gameData));
                game.source = strategy.name;
                if(game.status === 'invalid') {
                    game.status = 'updated'
                }
                game.dateModified = moment().format();
                await saveGame(game);
            } else if ((game.nameEn || game.nameJp) && game.forceAdditionalImagesUpdate) {
                game.forceAdditionalImagesUpdate = false;
                game.additionalImages = await strategy.getAdditionalImages(file.name);
                await saveGame(game);
            }

            await updateExecutableAndDirectory(file, game, strategy);
        }
        progressBar.update(index + 1);
    }
    progressBar.stop();
    db.close();
}

function selectStrategy(gameId) {
    let strategies = Object.values(parserStrategies);
    for (const strategy of strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }
}

module.exports = buildDbFromFolders;
