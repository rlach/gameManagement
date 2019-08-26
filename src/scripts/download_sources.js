const { removeUndefined } = require('../util/objects');
const progress = require('../util/progress');
const eachLimit = require('async/eachLimit');

const operation = 'Downloading sources';

async function downloadSources(strategies, database) {
    const progressBar = progress.getBar(operation);

    const games = await database.game.find({
        deleted: { $ne: true },
        $or: [
            { sourceMissingJp: { $ne: true } },
            { sourceMissingEn: { $ne: true } },
        ],
    });

    progressBar.start(games.length, 0);
    await eachLimit(games, 5, async game => {
        return downloadSource(game, strategies, database, progressBar);
    });

    progress.updateName(operation);
    progressBar.stop();
}

async function downloadSource(game, strategies, database, progressBar) {
    const strategy = selectStrategy(game.id, strategies);
    if (strategy) {
        game.source = strategy.name;

        if (!hasSourcesDownloaded(game)) {
            await updateSources(game, strategy, database);
        }

        if (game.forceSourceUpdate) {
            await updateSources(game, strategy, database);
        }

        if (game.forceAdditionalImagesUpdate) {
            await updateAdditionalImages(game, strategy, database);
        }
    }

    progressBar.increment();
}

async function updateAdditionalImages(game, strategy, database) {
    game.forceAdditionalImagesUpdate = false;
    game.additionalImages = await strategy.getAdditionalImages(game.id);
    await addAdditionalImagesToDb(game, game.additionalImages, database);
    await database.game.save(game);
}

async function updateSources(game, strategy, database) {
    game.forceSourceUpdate = false;
    const gameData = await strategy.fetchGameData(
        game.id,
        game,
        game.directory
    );
    const mainImageUrl = gameData.imageUrlJp
        ? gameData.imageUrlJp
        : gameData.imageUrlEn;
    if (mainImageUrl) {
        await addImageToDb(game, mainImageUrl, 'box', database);
    }
    Object.assign(game, removeUndefined(gameData));

    if (game.additionalImages) {
        await addAdditionalImagesToDb(game, game.additionalImages, database);
    } else {
        game.forceAdditionalImagesUpdate = true;
    }
    await database.game.save(game);
}

function selectStrategy(gameId, strategies) {
    for (const strategy of strategies) {
        if (strategy.shouldUse(gameId)) {
            return strategy;
        }
    }
}

function hasSourcesDownloaded(game) {
    return !!game.nameEn || !!game.nameJp;
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
        type,
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

module.exports = downloadSources;
