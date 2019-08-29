const download = require('image-downloader');
const fs = require('fs');
const constants = require('../../string_constants');
const files = require('../../util/files');

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

    const targetPath = `${launchboxPath}/Images/${platformName}/${imageTypePath}/Hisho86/${image.gameId}`;
    files.createMissingDirectory(targetPath);

    if (!fs.existsSync(`${targetPath}/${image.filename}`)) {
        const options = {
            url: image.uri,
            dest: `${targetPath}/${image.filename}`,
        };

        if (image.uri.includes('getchu')) {
            options.headers = {
                Referer: `http://www.getchu.com/soft.phtml?id=${image.gameId}`,
            };
        }

        await download.image(options);
    }
}

module.exports = { downloadImage };
