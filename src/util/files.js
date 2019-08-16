const { promisify } = require('util');

const find = require('fs-find');
const asyncFind = promisify(find);
const settings = require('../settings');

class Files {
    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBanned(f),
            depth: settings.exeSearchDepth,
            followLinks: true,
        });
    }

    async findImages(path, uuid) {
        return asyncFind(path, {
            file: (_, f) => f.matcher.startsWith(uuid),
            depth: 1,
        });
    }

    removeTagsAndMetadata(name) {
        let improvedName = name.replace(/\[([^\]]+)]/g, ''); //remove []
        improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
        improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
        improvedName = improvedName.replace(/\s+/g, ' ');
        improvedName = improvedName.trim();

        return improvedName;
    }

    createMissingLaunchboxDirectories(launchboxPath, platformName) {
        const imagesPath = `${launchboxPath}/Images`;

        this.createMissingDirectory(imagesPath);
        this.createMissingDirectory(`${imagesPath}/${platformName}`);
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${boxFrontPath}`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${screenshotPath}`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${backgroundPath}`
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
