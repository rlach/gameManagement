const files = require('../files');
const log = require('../logger');
const settings = require('../settings');
const { readdirSync } = require('fs');

async function findPossibleDuplicates() {
    log.info(`Reading all main paths`, settings.paths.main);
    const foundFiles = [];
    for (const path of settings.paths.main) {
        const singlePathFiles = (await files.readDir(path)).map(name => {
            return {
                name,
                path
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        const subdirectories = readdirSync(`${file.path}/${file.name}`, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        if (subdirectories.length > 1) {
            log.info(`${file.name} contains ${subdirectories.length - 1} possible duplicate(s)`);
        }
    }
}

module.exports = findPossibleDuplicates;
