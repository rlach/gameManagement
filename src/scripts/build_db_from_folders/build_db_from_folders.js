const log = require('../../logger');
const moment = require('moment/moment');
const fs = require('fs');
const { removeUndefined } = require('../../objects');
const executables = require('./find_executable');
const typeRecognizer = require('./recognize_game_type');
const progress = require('../../progress');

const operation = 'Building database from folders';

async function buildDbFromFolders(strategies, database, mainPaths) {
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
    for (const [index, file] of foundFiles.entries()) {
        progress.updateName(progressBar, `${operation} [${file.name}]`);

        const strategy = selectStrategy(file.name, strategies);
        if (!strategy) {
            log.debug('No strategy for file', file);
            continue;
        }

        let game = await database.game.retrieveGameFromDb(file.name);
        game.source = strategy.name;

        if (gameIsDeleted(file)) {
            game.deleted = true;
            game.dateModified = moment().format();
            await database.game.saveGame(game);
            continue;
        } else if (game.deleted) {
            game.deleted = false;
            game.dateModified = moment().format();
            await database.game.saveGame(game);
        }

        if (!game.engine) {
            game.engine = await typeRecognizer.recognizeGameType(file);
            if (game.engine) {
                game.dateModified = moment().format();
                await database.game.saveGame(game);
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
            if (
                (!game.nameEn && !game.nameJp) ||
                game.forceSourceUpdate ||
                game.status === 'invalid'
            ) {
                game.forceSourceUpdate = false;
                log.debug('Updating source web page(s)');
                const gameData = await strategy.fetchGameData(game.id, game);
                if (
                    (gameData.nameJp || gameData.nameEn) &&
                    (!gameData.additionalImages ||
                        gameData.additionalImages.length === 0)
                ) {
                    game.forceAdditionalImagesUpdate = false;
                    const newAdditionalImages = await strategy.getAdditionalImages(
                        file.name
                    );
                    if (
                        JSON.stringify(newAdditionalImages) !==
                        JSON.stringify(game.additionalImages)
                    ) {
                        gameData.additionalImages = newAdditionalImages;
                        game.redownloadAdditionalImages = true;
                    }
                }
                if (
                    game.imageUrlEn !== gameData.imageUrlEn ||
                    game.imageUrlJp !== game.imageUrlJp
                ) {
                    game.redownloadMainImage = true;
                }
                Object.assign(game, removeUndefined(gameData));
                if (game.status === 'invalid') {
                    game.status = 'updated';
                }
                game.dateModified = moment().format();
                await database.game.saveGame(game);
            }

            if (
                (game.nameEn || game.nameJp) &&
                game.forceAdditionalImagesUpdate
            ) {
                game.forceAdditionalImagesUpdate = false;
                const newAdditionalImages = await strategy.getAdditionalImages(
                    file.name
                );
                if (
                    JSON.stringify(newAdditionalImages) !==
                    JSON.stringify(game.additionalImages)
                ) {
                    game.additionalImages = newAdditionalImages;
                    game.redownloadAdditionalImages = true;
                }
                await database.game.saveGame(game);
            }

            await executables.updateExecutableAndDirectory(
                file,
                game,
                strategy,
                database
            );
        }
        progressBar.update(index + 1);
    }
    progress.updateName(progressBar, operation);
    progressBar.stop();
}

function selectStrategy(gameId, strategies) {
    for (const strategy of strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }
}

function gameIsDeleted(file) {
    if (!fs.existsSync(`${file.path}/${file.name}`)) {
        return true;
    }

    const subFiles = fs.readdirSync(`${file.path}/${file.name}`);
    return subFiles.length === 0 || subFiles.some(f => f === 'DELETED');
}

module.exports = buildDbFromFolders;
