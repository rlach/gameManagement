const { promisify } = require('util');
const fs = require('fs');
const find = require('fs-find');
const asyncFind = promisify(find);
const constants = require('../string_constants');

class Files {
    /* istanbul ignore next */
    async findByFilter(path, filterFunction, searchDepth = 1) {
        return asyncFind(path, {
            file: (_, f) => filterFunction(f),
            depth: Math.max(searchDepth, 1),
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

        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.boxFrontPath}/Hisho86`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.screenshotPath}/Hisho86`
        );
        this.createMissingDirectory(
            `${imagesPath}/${platformName}/${constants.backgroundPath}/Hisho86`
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
