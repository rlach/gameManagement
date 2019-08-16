const download = require('image-downloader');
const fs = require('fs');
const constants = require('../../string_constants');

async function downloadImage(launchboxPath, platformName, image) {
    let imageTypePath;
    switch (image.type) {
        case 'background':
            imageTypePath = constants.backgroundPath;
            break;
        case 'box':
            imageTypePath = constants.boxFrontPath;
            break;
        case 'screenshot':
        default:
            imageTypePath = constants.screenshotPath;
            break;
    }

    const targetPath = `${launchboxPath}/Images/${platformName}/${imageTypePath}/${image.filename}`;

    if (!fs.existsSync(targetPath)) {
        await download.image({
            url: image.uri,
            dest: targetPath,
        });
    }
}

module.exports = { downloadImage };
