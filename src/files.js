const {promisify} = require('util');

const find = require('fs-find');
const asyncFind = promisify(find);
const settings = require('./settings');

class Files {
    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBanned(f),
            depth: settings.exeSearchDepth,
            followLinks: true
        });
    }

    removeTagsAndMetadata(name) {
        let improvedName = name.replace(/\[([^\]]+)\]/g, ''); //remove []
        improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
        improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
        improvedName = improvedName.trim();

        return improvedName;
    }
}

let files = new Files();
module.exports = files;

function hasProperExtension(fileName) {
    return settings.executableExtensions.findIndex(extension => fileName.toLowerCase().endsWith(extension)) > -1;
}

function isBanned(fileName) {
    return settings.bannedFilenames.findIndex(bannedName => fileName.toLowerCase().includes(bannedName)) > -1;
}
