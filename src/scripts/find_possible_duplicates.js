const Hjson = require('hjson');
const fs = require('fs');

function findPossibleDuplicates(mainPaths) {
    const foundFiles = [];
    const duplicates = [];
    for (const path of mainPaths) {
        const singlePathFiles = fs.readdirSync(path).map(name => {
            return {
                name,
                path,
            };
        });
        foundFiles.push(...singlePathFiles);
    }

    for (const file of foundFiles) {
        const allSubFiles = fs.readdirSync(`${file.path}/${file.name}`, {
            withFileTypes: true,
        });

        const subdirectories = allSubFiles
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        let versions = subdirectories.length;

        if (
            versions > 1 &&
            fs.existsSync(`${file.path}/${file.name}/versions.txt`)
        ) {
            const acceptedVersions = fs
                .readFileSync(`${file.path}/${file.name}/versions.txt`)
                .toString()
                .split('\n')
                .map(v => v.trim());

            if (versions < acceptedVersions.length) {
                versions = -2;
            } else {
                const acceptedSubdirectories = subdirectories.filter(d =>
                    acceptedVersions.includes(d)
                );
                if (acceptedSubdirectories.length > 0) {
                    versions = versions - acceptedSubdirectories.length + 1; // Add 1 because all accepted versions count as 1
                }
            }
        }

        if (versions === 0 && allSubFiles.length > 0) {
            versions = -1;
        }

        addResult(duplicates, file.name, versions, file.path);
    }

    let results = duplicates
        .filter(d => d.sum > 1 || d.hasWrongEntries || d.hasWrongVersionTxt)
        .sort((a, b) => b.sum - a.sum)
        .reduce((target, current) => {
            let result = {};

            let statuses = [];
            if (current.sum > 1) {
                statuses.push(`${current.sum} duplicate(s)`);
            }
            if (current.hasWrongEntries) {
                statuses.push('has wrong structure');
            }
            if (current.hasWrongVersionTxt) {
                statuses.push('has wrong version.txt');
            }
            result.status = statuses.join(', ');
            current.values.forEach(v => {
                result[`${v.path}/${current.name}`] = nameFromValue(v);
            });

            target[current.name] = result;
            return target;
        }, {});

    fs.writeFileSync(
        'duplicates.txt',
        Hjson.stringify(results, {
            bracesSameLine: true,
        })
    );
}

function nameFromValue(value) {
    if (value.value === -2) {
        return 'wrong version.txt';
    } else if (value.value === -1) {
        return 'wrong structure';
    } else {
        return `${value.value} duplicate(s)`;
    }
}

function addResult(results, name, value, path) {
    let result = results.find(r => r.name === name);

    let entry = {
        value,
        path,
    };

    if (!result) {
        result = {
            name,
            values: [entry],
            sum: Math.max(value, 0),
            hasWrongEntries: value === -1,
            hasWrongVersionTxt: value === -2,
        };

        results.push(result);
    } else {
        result.values.push(entry);
        result.sum += Math.max(value, 0);
        result.hasWrongEntries = results.hasWrongEntries || value === -1;
        result.hasWrongVersionTxt =
            result.hasWrongVersionTxt || result.hasWrongVersionTxt === -2;
    }
}

module.exports = findPossibleDuplicates;
