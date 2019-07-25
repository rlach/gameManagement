const files = require('./files');
const fs = require('fs');
const log = require('./logger');
const parserStrategies = require('./parsers');
const settings = require('./settings');

async function main() {
    log.info(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = await files.readDir(settings.paths.unsortedGames);

    const all = foundFiles.length;
    let current = 0;
    let lastFloor = 0;

    for (const file of foundFiles) {
        current++;
        const newFloor = Math.floor(current / all * 100);
        if(newFloor > lastFloor) {
            lastFloor = newFloor;
            log.info(`Processed ${newFloor}%`);
        }
        const foundCodesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;

        if (file.startsWith('!') || file.startsWith('RJ') || file.startsWith('VJ') || file.startsWith('RE') || /^\d+$/.test(file) || fs.existsSync(foundCodesPath)) {
            log.info(`Skipping file ${file}`);
        } else {
            log.info(`Processing file ${file}`);
            let strategies = Object.values(parserStrategies);
            const fileResults = {
                file
            };
            for (const strategy of strategies) {
                log.debug('Strategy', {strategy, file});
                fileResults[strategy.name] = {
                    extractedCode: strategy.extractCode(file),
                    foundCodes: await strategy.findGame(removeTagsAndMetadata(file))
                };
            }
            try {
                await files.writeFile(foundCodesPath, JSON.stringify(fileResults, null, 4));
            } catch (e) {
                log.error('Error writing codes', e);
            }
        }
    }

    log.info('Finished parsing');
}

main().catch(e => log.error('Main process crashed', e));

function removeTagsAndMetadata(name) {
    let improvedName = name.replace(/\[([^\]]+)\]/g, ''); //remove []
    improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
    improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
    improvedName = improvedName.trim();

    return improvedName;
}
