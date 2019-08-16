const files = require('../util/files');
const fs = require('fs');
const log = require('../util/logger');
const progress = require('../util/progress');

const operation = 'Getting game codes';

async function getPossibleCodes(strategies, unsortedGamesPath) {
    const progressBar = progress.getBar();
    progress.updateName(`${operation}`);
    log.debug(`Reading ${unsortedGamesPath}`);
    const foundFiles = fs.readdirSync(unsortedGamesPath);

    progressBar.start(foundFiles.length, 0);
    for (const [index, file] of foundFiles.entries()) {
        progress.updateName(progressBar, `${operation} [${file}]`);
        const foundCodesPath = `${unsortedGamesPath}/${file}/!foundCodes.txt`;

        if (fs.existsSync(foundCodesPath)) {
            log.debug(`Skipping file ${file}`);
        } else {
            log.debug(`Processing file ${file}`);
            const fileResults = {
                file,
            };

            const promises = [];
            for (const strategy of strategies) {
                promises.push(
                    strategy.findGame(files.removeTagsAndMetadata(file))
                );
            }
            const results = await Promise.all(promises);

            for (const [index, strategy] of strategies.entries()) {
                fileResults[strategy.name] = {
                    extractedCode: strategy.extractCode(file),
                    foundCodes: results[index],
                };
            }
            try {
                fs.writeFileSync(
                    foundCodesPath,
                    JSON.stringify(fileResults, null, 4)
                );
            } catch (e) {
                log.debug('Error writing codes', e);
            }
        }
        progressBar.update(index + 1);
    }
    progress.updateName(progressBar, `${operation}`);
    progressBar.stop();
    log.debug('Finished parsing');
}

module.exports = getPossibleCodes;
