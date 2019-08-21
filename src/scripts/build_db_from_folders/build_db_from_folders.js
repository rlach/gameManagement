const log = require('../../util/logger');
const fs = require('fs');
const { removeUndefined } = require('../../util/objects');
const executables = require('./find_executable');
const engineRecognizer = require('./recognize_game_engine');
const progress = require('../../util/progress');
const eachLimit = require('async/eachLimit');

const operation = 'Building database from folders';

async function buildDbFromFolders(
    strategies,
    database,
    mainPaths,
    searchSettings
) {
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
        return buildDbFromFolder(
            file,
            strategies,
            database,
            progressBar,
            searchSettings
        );
    });

    progress.updateName(progressBar, operation);
    progressBar.stop();
}

async function buildDbFromFolder(
    file,
    strategies,
    database,
    progressBar,
    searchSettings
) {
    const strategy = selectStrategy(file.name, strategies);
    if (!strategy) {
        log.debug('No strategy for file', file);
        return;
    }

    let game = await database.game.retrieveFromDb(file.name);
    game.source = strategy.name;

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
        await executables.updateExecutableAndDirectory(
            file,
            game,
            searchSettings,
            database
        );
    }

    if (game.executableFile && !game.engine) {
        game.engine = await engineRecognizer.recognizeGameEngine(file);
        if (game.engine) {
            await database.game.save(game);
        }
    }

    if (!hasSourcesDownloaded(game)) {
        await updateSources(file, game, strategy, database);
    }

    if (game.forceSourceUpdate && !allSourcesAreMissing(game)) {
        await updateSources(file, game, strategy, database);
    }

    if (game.forceAdditionalImagesUpdate && !allSourcesAreMissing(game)) {
        await updateAdditionalImages(file, game, strategy, database);
    }

    progressBar.increment();
}

async function updateAdditionalImages(file, game, strategy, database) {
    game.forceAdditionalImagesUpdate = false;
    game.additionalImages = await strategy.getAdditionalImages(file.name);
    await addAdditionalImagesToDb(game, game.additionalImages, database);
    await database.game.save(game);
}

async function updateSources(file, game, strategy, database) {
    game.forceSourceUpdate = false;
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
    Object.assign(game, removeUndefined(gameData));
    await database.game.save(game);

    if (game.additionalImages) {
        await addAdditionalImagesToDb(game, game.additionalImages, database);
    } else {
        await updateAdditionalImages(file, game, strategy, database);
    }
}

function selectStrategy(gameId, strategies) {
    for (const strategy of strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }
}

function allSourcesAreMissing(game) {
    return game.sourceMissingJp && game.sourceMissingEn;
}

function hasSourcesDownloaded(game) {
    return !!game.nameEn || !!game.nameJp || allSourcesAreMissing(game);
}

function isDeleted(file) {
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
