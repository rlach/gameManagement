const cliProgress = require('cli-progress');
const files = require('../files');
const fs = require('fs');
const log = require('../logger');
const parserStrategies = require('../parsers');
const settings = require('../settings');

async function getPossibleCodes() {
    const progressBar = new cliProgress.Bar(
        {
            format: 'Getting game codes [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} games'
        },
        cliProgress.Presets.shades_classic
    );
    log.debug(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = fs.readdirSync(settings.paths.unsortedGames);

    progressBar.start(foundFiles.length, 0);
    for (const [index, file] of foundFiles.entries()) {
        const foundCodesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;

        if (
            file.startsWith('!') ||
            file.startsWith('RJ') ||
            file.startsWith('VJ') ||
            file.startsWith('RE') ||
            /^\d+$/.test(file) ||
            fs.existsSync(foundCodesPath)
        ) {
            log.debug(`Skipping file ${file}`);
        } else {
            log.debug(`Processing file ${file}`);
            let strategies = Object.values(parserStrategies);
            const fileResults = {
                file
            };

            const promises = [];
            for (const strategy of strategies) {
                promises.push(strategy.findGame(files.removeTagsAndMetadata(file)));
            }
            const results = await Promise.all(promises);

            for (const [index, strategy] of strategies.entries()) {
                log.debug('Strategy', { strategy, file });
                fileResults[strategy.name] = {
                    extractedCode: strategy.extractCode(file),
                    foundCodes: results[index]
                };
            }
            try {
                fs.writeFileSync(foundCodesPath, JSON.stringify(fileResults, null, 4));
            } catch (e) {
                log.debug('Error writing codes', e);
            }
        }
        progressBar.update(index + 1);
    }
    progressBar.stop();
    log.debug('Finished parsing');
}

module.exports = getPossibleCodes;
