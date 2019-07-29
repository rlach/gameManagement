const files = require('../files');
const fs = require('fs');
const log = require('../logger');
const parserStrategies = require('../parsers');
const settings = require('../settings');

async function getPossibleCodes() {
    log.info(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = fs.readdirSync(settings.paths.unsortedGames);

    const all = foundFiles.length;
    let current = 0;
    let lastFloor = 0;

    for (const file of foundFiles) {
        current++;
        const newFloor = Math.floor((current / all) * 100);
        if (newFloor > lastFloor) {
            lastFloor = newFloor;
            log.info(`Processed ${newFloor}%`);
        }
        const foundCodesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;

        if (
            file.startsWith('!') ||
            file.startsWith('RJ') ||
            file.startsWith('VJ') ||
            file.startsWith('RE') ||
            /^\d+$/.test(file) ||
            fs.existsSync(foundCodesPath)
        ) {
            log.info(`Skipping file ${file}`);
        } else {
            log.info(`Processing file ${file}`);
            let strategies = Object.values(parserStrategies);
            const fileResults = {
                file
            };
            for (const strategy of strategies) {
                log.debug('Strategy', { strategy, file });
                fileResults[strategy.name] = {
                    extractedCode: strategy.extractCode(file),
                    foundCodes: await strategy.findGame(files.removeTagsAndMetadata(file))
                };
            }
            try {
                fs.writeFileSync(foundCodesPath, JSON.stringify(fileResults, null, 4));
            } catch (e) {
                log.error('Error writing codes', e);
            }
        }
    }

    log.info('Finished parsing');
}

module.exports = getPossibleCodes;