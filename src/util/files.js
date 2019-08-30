const { promisify } = require('util');
const fs = require('fs');
const find = require('fs-find');
const asyncFind = promisify(find);
const { IMAGE_PATHS } = require('../string_constants');

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
        const paths = [
            `${launchboxPath}/Data/Platforms`,
            `${launchboxPath}/Images/${platformName}/${IMAGE_PATHS.PACKAGE}/Hisho86`,
            `${launchboxPath}/Images/${platformName}/${IMAGE_PATHS.SCREENSHOT}/Hisho86`,
            `${launchboxPath}/Images/${platformName}/${IMAGE_PATHS.BACKGROUND}/Hisho86`,
        ];

        paths.forEach(p => this.createMissingDirectoriesForPath(p));
    }

    createMissingDirectoriesForPath(path) {
        const splitPath = path.split('/').filter(p => p !== '');
        let currentPath = '';
        splitPath.forEach(pathPart => {
            currentPath = currentPath + pathPart + '/';
            this.createMissingDirectory(currentPath);
        });
    }

    createMissingDirectory(path) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}

let files = new Files();
module.exports = files;
