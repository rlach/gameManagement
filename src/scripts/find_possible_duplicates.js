const log = require('../logger');
const settings = require('../settings');
const fs = require('fs');

async function findPossibleDuplicates() {
    log.info(`Reading all main paths`, settings.paths.main);
    const foundFiles = [];
    const duplicates = {};
    for (const path of settings.paths.main) {
        const singlePathFiles = fs.readdirSync(path).map(name => {
            return {
                name,
                path
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        const subdirectories = fs.readdirSync(`${file.path}/${file.name}`, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        if (subdirectories.length > 1) {
            log.info(`${file.name} contains ${subdirectories.length - 1} possible duplicate(s)`);
            duplicates[file.name] = subdirectories.length - 1;
        }
    }

    fs.writeFileSync('duplicates.txt', JSON.stringify(duplicates, null, 4));
}

module.exports = findPossibleDuplicates;
