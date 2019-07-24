const files = require('./files');
const log = require('./logger');
const parserStrategies = require('./parsers');

const mainPath = './sample';

async function main() {
    log.info(`Reading ${mainPath}`);
    const foundFiles = await files.readDir(mainPath);

    const results = [];

    for (const file of foundFiles) {
        let strategies = Object.values(parserStrategies);
        const fileResults = {
            file
        };
        for (const strategy of strategies) {
            log.info('Strategy', { strategy, file });
            fileResults[strategy.name] = {
                extractedCode: strategy.extractCode(file),
                foundCodes: await strategy.findGame(removeTagsAndMetadata(file))
            };
        }
        results.push(fileResults);
        await files.writeFile(`${mainPath}/${file}/!foundCodes.txt`, JSON.stringify(fileResults, null, 4));
    }

    log.info(results);
}

main().catch(e => log.error('Main process crashed', e));

function removeTagsAndMetadata(name) {
    let improvedName = name.replace(/\[([^\]]+)\]/g, '');
    improvedName = improvedName.replace(/\(([^)]+)\)/g, '');
    improvedName = improvedName.replace(/Ver.*/gi, '');
    improvedName = improvedName.trim();

    return improvedName;
}
