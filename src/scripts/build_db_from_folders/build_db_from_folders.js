const log = require('../../logger');
const moment = require('moment/moment');
const fs = require('fs');
const { removeUndefined } = require('../../objects');
const executables = require('./find_executable');
const typeRecognizer = require('./recognize_game_type');
const progress = require('../../progress');
const eachLimit = require('async/eachLimit');

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
    await eachLimit(foundFiles, 5, async file => {
        return buildDbFromFolder(file, strategies, database, progressBar);
    });

    progress.updateName(progressBar, operation);
    progressBar.stop();
}

async function buildDbFromFolder(file, strategies, database, progressBar) {
    const strategy = selectStrategy(file.name, strategies);
    if (!strategy) {
        log.debug('No strategy for file', file);
        return;
    }

    let game = await database.game.retrieveFromDb(file.name);
    game.source = strategy.name;

    if (gameIsDeleted(file)) {
        game.deleted = true;
        game.dateModified = moment().format();
        await database.game.save(game);
        return;
    } else if (game.deleted) {
        game.deleted = false;
        game.dateModified = moment().format();
        await database.game.save(game);
    }

    if (!game.engine) {
        game.engine = await typeRecognizer.recognizeGameType(file);
        if (game.engine) {
            game.dateModified = moment().format();
            await database.game.save(game);
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
            const gameData = await strategy.fetchGameData(
                game.id,
                game,
                `${file.path}/${file.name}`
            );
            const mainImageUrl = gameData.imageUrlJp
                ? gameData.imageUrlJp
                : gameData.imageUrlEn;
            if (mainImageUrl) {
                await addImageToDb(game, mainImageUrl, 'box', database);
            }
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
                    await addAdditionalImagesToDb(
                        game,
                        newAdditionalImages,
                        database
                    );
                }
            }
            if (
                game.imageUrlEn !== gameData.imageUrlEn ||
                game.imageUrlJp !== game.imageUrlJp
            ) {
                const mainImageUrl = gameData.imageUrlJp
                    ? gameData.imageUrlJp
                    : gameData.imageUrlEn;
                if (mainImageUrl) {
                    await addImageToDb(game, mainImageUrl, 'box', database);
                }
            }
            Object.assign(game, removeUndefined(gameData));
            if (game.status === 'invalid') {
                game.status = 'updated';
            }
            game.dateModified = moment().format();
            await database.game.save(game);

            await addAdditionalImagesToDb(
                game,
                game.additionalImages,
                database
            );
        }

        if ((game.nameEn || game.nameJp) && game.forceAdditionalImagesUpdate) {
            game.forceAdditionalImagesUpdate = false;
            const newAdditionalImages = await strategy.getAdditionalImages(
                file.name
            );
            if (
                JSON.stringify(newAdditionalImages) !==
                JSON.stringify(game.additionalImages)
            ) {
                game.additionalImages = newAdditionalImages;
                await addAdditionalImagesToDb(
                    game,
                    game.additionalImages,
                    database
                );
            }
            await database.game.save(game);
        }

        await executables.updateExecutableAndDirectory(
            file,
            game,
            strategy,
            database
        );
    }
    progressBar.increment();
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

async function addAdditionalImagesToDb(game, additionalImages, database) {
    if (additionalImages) {
        for (const imageUri of additionalImages) {
            await addImageToDb(game, imageUri, 'screenshot', database);
        }

        if (additionalImages.length > 0) {
            const imageUri = additionalImages[additionalImages.length - 1];
            await addImageToDb(game, imageUri, 'background', database);
        }
    }
}

async function addImageToDb(game, imageUri, type, database) {
    let imageEntry = await database.image.findOne({
        gameId: game.id,
        uri: imageUri,
    });
    if (!imageEntry) {
        await database.image.save({
            gameId: game.id,
            launchboxId: game.launchboxId,
            uri: imageUri,
            status: 'toDownload',
            type: type,
            filename: `${game.launchboxId}.${imageUri.substring(
                imageUri.lastIndexOf('/') + 1
            )}`,
        });
    } else {
        imageEntry.status = 'toDownload';
        database.image.save(imageEntry);
    }
}

module.exports = buildDbFromFolders;
