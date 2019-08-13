const download = require('image-downloader');
const fs = require('fs');
const settings = require('../../../settings');

const boxFrontPath = 'Box - Front - Reconstructed'; // Use reconstructed so when user uploads his own box front to 'Box - Front' it will be used instead
const backgroundPath = 'Clear Logo'; // So user can use 'Fanart - Background' which has higher priority
const screenshotPath = 'Screenshot - Gameplay';

async function downloadImage(launchboxPath, platformName, image) {
    let imageTypePath;
    switch (image.type) {
        case 'background':
            imageTypePath = backgroundPath;
            break;
        case 'box':
            imageTypePath = boxFrontPath;
            break;
        case 'screenshot':
        default:
            imageTypePath = screenshotPath;
            break;
    }

    const targetPath = `${launchboxPath}/Images/${platformName}/${imageTypePath}/${image.filename}`;

    if(!fs.existsSync(targetPath)) {
        await download.image({
            url: image.uri,
            dest: targetPath,
        });
    }
}

function createMissingDirectories(launchboxPath, platformName) {
    const imagesPath = `${settings.paths.launchbox}/Images`;

    createMissingDirectory(imagesPath);
    createMissingDirectory(`${imagesPath}/${platformName}`);
    createMissingDirectory(`${imagesPath}/${platformName}/${boxFrontPath}`);
    createMissingDirectory(`${imagesPath}/${platformName}/${screenshotPath}`);
    createMissingDirectory(`${imagesPath}/${platformName}/${backgroundPath}`);
}

function createMissingDirectory(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

module.exports = { createMissingDirectories, downloadImage };
