const download = require('image-downloader');
const moment = require('moment/moment');
const fs = require('fs');
const settings = require('../../settings');
const log = require('../../logger');
const files = require('../../files');

async function downloadImages(game, launchboxId, databaseGame) {
    let modified = false;
    const regexExtension = /\.\w{3,4}($|\?)/;
    let imageUrl = game.imageUrlEn ? game.imageUrlEn : game.imageUrlJp;
    if (settings.preferredImageSource === 'jp') {
        imageUrl = game.imageUrlJp ? game.imageUrlJp : game.imageUrlEn;
    }
    if (!imageUrl) {
        return;
    }

    if (!fs.existsSync(`${settings.paths.launchbox}/Images`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images`);
    }
    if (
        !fs.existsSync(
            `${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`
        )
    ) {
        fs.mkdirSync(
            `${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`
        );
    }
    if (
        !fs.existsSync(
            `${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`
        )
    ) {
        fs.mkdirSync(
            `${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`
        );
    }

    const targetPathMainImage = `${settings.paths.launchbox}/Images/${
        settings.launchboxPlatform
    }/Box - Front/${launchboxId}-01${imageUrl.match(regexExtension)[0]}`;

    if (game.redownloadMainImage && fs.existsSync(targetPathMainImage)) {
        fs.unlinkSync(targetPathMainImage);
        game.redownloadMainImage = false;
        modified = true;
    }

    if (fs.existsSync(targetPathMainImage)) {
        log.debug('Image already exists, skipping', targetPathMainImage);
    } else {
        log.debug('Downloading main image', {
            imageUrl,
            launchboxId,
            targetPath: targetPathMainImage,
        });

        try {
            await download.image({
                url: imageUrl,
                dest: targetPathMainImage,
            });
        } catch (e) {
            log.debug('Error downloading image', e);
        }
    }

    const gameplayPath = `${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Screenshot - Gameplay`;
    if (!fs.existsSync(gameplayPath)) {
        fs.mkdirSync(gameplayPath);
    }

    if (game.redownloadAdditionalImages) {
        const existingImages = await files.findImages(
            gameplayPath,
            launchboxId
        );

        for (const image of existingImages) {
            fs.unlinkSync(image.file);
        }

        game.redownloadAdditionalImages = false;
        modified = true;
    }

    if (game.additionalImages) {
        const invalidImageIndexes = [];
        for (const [
            index,
            additionalImage,
        ] of game.additionalImages.entries()) {
            log.debug('Processing additionalImage', additionalImage);
            const targetPathAdditionalImage = `${
                settings.paths.launchbox
            }/Images/${
                settings.launchboxPlatform
            }/Screenshot - Gameplay/${launchboxId}-${String(index + 1).padStart(
                2,
                '0'
            )}${additionalImage.match(regexExtension)[0]}`;

            if (fs.existsSync(targetPathAdditionalImage)) {
                log.debug(
                    'Additional image already exists, skipping',
                    targetPathAdditionalImage
                );
            } else {
                log.debug('Downloading additional image', {
                    additionalImage,
                    launchboxId,
                    targetPath: targetPathAdditionalImage,
                });

                try {
                    await download.image({
                        url: additionalImage,
                        dest: targetPathAdditionalImage,
                    });

                    if (
                        index === game.additionalImages.length - 1 &&
                        fs.existsSync(targetPathAdditionalImage)
                    ) {
                        const targetPathBackground = targetPathAdditionalImage.replace(
                            'Screenshot - Gameplay',
                            'Fanart - Background'
                        );
                        fs.copyFileSync(
                            targetPathAdditionalImage,
                            targetPathBackground
                        );
                    }
                } catch (e) {
                    log.debug('Error downloading image', e);
                    if (e.message.includes('404')) {
                        invalidImageIndexes.push(index);
                    }
                }
            }
        }
        for (let i = invalidImageIndexes.length - 1; i >= 0; i--) {
            game.additionalImages.splice(invalidImageIndexes[i], 1);
            modified = true;
        }
    }
    if (modified) {
        game.dateModified = new moment().format();
        await databaseGame.saveGame(game);
    }
}

module.exports = downloadImages;
