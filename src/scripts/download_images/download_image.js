const download = require('image-downloader');
const fs = require('fs');
const { IMAGE_PATHS } = require('../../string_constants');
const files = require('../../util/files');

async function downloadImage(launchboxPath, platformName, image) {
    let imageTypePath;
    switch (image.type) {
        case 'background':
            imageTypePath = IMAGE_PATHS.BACKGROUND;
            break;
        case 'box':
            imageTypePath = IMAGE_PATHS.PACKAGE;
            break;
        case 'screenshot':
        default:
            imageTypePath = IMAGE_PATHS.SCREENSHOT;
            break;
    }

    const targetPath = `${launchboxPath}/Images/${platformName}/${imageTypePath}/Hisho86/${image.gameId}`;
    files.createMissingDirectory(targetPath);

    if (!fs.existsSync(`${targetPath}/${image.filename}`)) {
        await download.image({
            url: image.uri,
            dest: `${targetPath}/${image.filename}`,
        });
    }
}

module.exports = { downloadImage };
