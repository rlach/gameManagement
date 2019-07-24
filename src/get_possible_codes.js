const files = require('./files');
const log = require('./logger');
const parserStrategies = require('./parsers');
const settings = require('./settings');

async function main() {
    log.info(`Reading ${settings.paths.main}`);
    const foundFiles = await files.readDir(settings.paths.main);

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
        try {
            await files.writeFile(`${settings.paths.main}/${file}/!foundCodes.txt`, JSON.stringify(fileResults, null, 4));
        } catch(e) {
            log.error('Error writing codes', e);
        }
    }

    log.info(results);
}

main().catch(e => log.error('Main process crashed', e));

function removeTagsAndMetadata(name) {
    let improvedName = name.replace(/\[([^\]]+)\]/g, ''); //remove []
    improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
    improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
    improvedName = improvedName.trim();

    return improvedName;
}
