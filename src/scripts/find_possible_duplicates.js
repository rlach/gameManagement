const log = require('../util/logger');
const settings = require('../settings');
const fs = require('fs');

async function findPossibleDuplicates() {
    log.debug(`Reading all main paths`, settings.paths.main);
    const foundFiles = [];
    const duplicates = {};
    for (const path of settings.paths.main) {
        const singlePathFiles = fs.readdirSync(path).map(name => {
            return {
                name,
                path,
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        let acceptedVersions = [];
        if (fs.existsSync(`${file.path}/${file.name}/versions.txt`)) {
            acceptedVersions = fs
                .readFileSync(`${file.path}/${file.name}/versions.txt`)
                .toString()
                .split('\n')
                .map(v => v.trim());
        }
        const subdirectories = fs
            .readdirSync(`${file.path}/${file.name}`, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        const acceptedSubdirectories = subdirectories.filter(d =>
            acceptedVersions.includes(d)
        );

        let versions = subdirectories.length;
        if (acceptedSubdirectories.length > 0) {
            versions = versions - acceptedSubdirectories.length + 1; // Add 1 because all accepted versions count as 1
        }

        if (versions > 1) {
            log.debug(
                `${file.name} contains ${subdirectories.length -
                    1} possible duplicate(s)`
            );
            duplicates[file.name] = subdirectories.length - 1;
        } else if (subdirectories.length === 0) {
            duplicates[file.name] = -1;
        }
    }

    fs.writeFileSync('duplicates.txt', JSON.stringify(duplicates, null, 4));
}

module.exports = findPossibleDuplicates;
