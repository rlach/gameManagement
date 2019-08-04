const download = require('image-downloader');
const moment = require('moment/moment');
const fs = require('fs');
const settings = require('../../settings');
const log = require('../../logger');

async function downloadImages(game, launchboxId) {
    if (!settings.downloadImages) {
        return;
    }
    const regexExtension = /\.\w{3,4}($|\?)/;
    const imageUrl = game.imageUrlEn ? game.imageUrlEn : game.imageUrlJp;
    if (!imageUrl) {
        return;
    }

    if (!fs.existsSync(`${settings.paths.launchbox}/Images`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images`);
    }
    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`);
    }
    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`);
    }

    const targetPathMainImage = `${settings.paths.launchbox}/Images/${
        settings.launchboxPlatform
    }/Box - Front/${launchboxId}-01${imageUrl.match(regexExtension)[0]}`;

    if (fs.existsSync(targetPathMainImage)) {
        log.debug('Image already exists, skipping', targetPathMainImage);
    } else {
        log.debug('Downloading main image', {
            imageUrl,
            launchboxId,
            targetPath: targetPathMainImage
        });

        try {
            await download.image({
                url: imageUrl,
                dest: targetPathMainImage
            });
        } catch (e) {
            log.debug('Error downloading image', e);
        }
    }

    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Screenshot - Gameplay`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Screenshot - Gameplay`);
    }
    if (game.additionalImages) {
        for (const [index, additionalImage] of game.additionalImages.entries()) {
            log.debug('Processing additionalImage', additionalImage);
            const targetPathAdditionalImage = `${settings.paths.launchbox}/Images/${
                settings.launchboxPlatform
            }/Screenshot - Gameplay/${launchboxId}-${String(index + 1).padStart(2, '0')}${
                additionalImage.match(regexExtension)[0]
            }`;

            if (fs.existsSync(targetPathAdditionalImage)) {
                log.debug('Additional image already exists, skipping', targetPathAdditionalImage);
            } else {
                log.debug('Downloading additional image', {
                    additionalImage,
                    launchboxId,
                    targetPath: targetPathAdditionalImage
                });

                try {
                    await download.image({
                        url: additionalImage,
                        dest: targetPathAdditionalImage
                    });
                } catch (e) {
                    log.debug('Error downloading image', e);
                    if (e.message.includes('404')) {
                        log.debug('Got 404, removing image from DB');
                        game.additionalImages.splice(index, 1);
                        game.dateModified = new moment().format();
                        game.save();
                        break; //Just download rest next time
                    }
                }
            }
        }
    }
}

module.exports = downloadImages;