const { promisify } = require('util');
const fs = require('fs');
const find = require('fs-find');
const asyncFind = promisify(find);
const settings = require('../settings');
const constants = require('../string_constants');

class Files {
    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBanned(f),
            depth: settings.exeSearchDepth,
            followLinks: true,
        });
    }

    removeTagsAndMetadata(name) {
        let improvedName = name.replace(/\[([^\]]+)]/g, ''); //remove []
        improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
        improvedName = improvedName.replace(/（([^）]+)）/g, ''); //remove japanese ()
        improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
        improvedName = improvedName.replace(/・/g, ''); // replace bad characters
        improvedName = improvedName.replace(/\s+/g, ' ');
        improvedName = improvedName.trim();

        return improvedName;
    }

    createMissingLaunchboxDirectories(launchboxPath, platformName) {
        this.createMissingDirectory(`${launchboxPath}/Data`);
        this.createMissingDirectory(`${launchboxPath}/Data/Platforms`);

        const imagesPath = `${launchboxPath}/Images`;

        this.createMissingDirectory(imagesPath);
        this.createMissingDirectory(`${imagesPath}/${platformName}`);
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.boxFrontPath}`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.screenshotPath}`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.backgroundPath}`
        );
    }

    createMissingDirectory(path) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}

let files = new Files();
module.exports = files;

function hasProperExtension(fileName) {
    return (
        settings.executableExtensions.findIndex(extension =>
            fileName.toLowerCase().endsWith(extension)
        ) > -1
    );
}

function isBanned(fileName) {
    return (
        settings.bannedFilenames.findIndex(bannedName =>
            fileName.toLowerCase().includes(bannedName)
        ) > -1
    );
}
