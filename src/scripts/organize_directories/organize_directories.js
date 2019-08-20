const fs = require('fs');
const log = require('../../util/logger');
const progress = require('../../util/progress');
const scoreResults = require('./confirm_scoring_results');

const operation = 'Organizing directories';

async function organizeDirectories(strategies, settings) {
    const progressBar = progress.getBar(operation);
    log.debug(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = fs.readdirSync(settings.paths.unsortedGames);

    const targetFolder = `${settings.paths.targetSortFolder}`;

    progressBar.start(foundFiles.length, 0);
    for (const [index, file] of foundFiles.entries()) {
        progress.updateName(progressBar, `${operation} [${file}]`);
        progressBar.update(index + 1);
        const foundFilesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;
        if (!fs.existsSync(foundFilesPath)) {
            continue;
        }
        try {
            const fileCodes = JSON.parse(
                fs.readFileSync(foundFilesPath, 'utf8')
            );
            if (fileCodes.noMatch) {
                log.debug(`File manually set as no match, ${file}`);
                continue;
            }

            let results = [];
            for (const strategy of strategies) {
                results.push(
                    ...strategy.scoreCodes(fileCodes[strategy.name], file)
                );
            }
            const minScore = settings.organizeDirectories.shouldAsk
                ? settings.organizeDirectories.minimumScoreToAsk
                : settings.organizeDirectories.minimumScoreToAccept;
            results = results
                .filter(r => r.score >= minScore)
                .sort((a, b) => b.score - a.score);

            if (results.length > 0) {
                let bestResult = results[0];
                if (
                    settings.organizeDirectories.shouldAsk &&
                    bestResult.score <
                        settings.organizeDirectories.minimumScoreToAccept
                ) {
                    try {
                        bestResult = await scoreResults.confirmResults(
                            results,
                            file,
                            settings.organizeDirectories.maxResultsToSuggest
                        );
                    } catch (e) {
                        if (e.code === 'RESULT_REJECTED') {
                            fileCodes.noMatch = true;
                            fs.writeFileSync(
                                foundFilesPath,
                                JSON.stringify(fileCodes, null, 4)
                            );
                        }
                    }
                }

                if (
                    bestResult.score >=
                        settings.organizeDirectories.minimumScoreToAccept ||
                    bestResult.accepted
                ) {
                    const gameFolder = `${targetFolder}/${bestResult.code}`;
                    if (!fs.existsSync(gameFolder)) {
                        fs.mkdirSync(gameFolder);
                    } else {
                        log.debug(`There is a duplicate`, bestResult.code);
                    }

                    fs.renameSync(
                        `${settings.paths.unsortedGames}/${file}`,
                        `${gameFolder}/${file}`
                    );
                    log.debug(
                        `Moved ${settings.paths.unsortedGames}/${file} to ${gameFolder}/${file}`
                    );
                }
            }
        } catch (e) {
            log.debug('Error getting proper file codes', e);
        }
    }
    progress.updateName(progressBar, operation);
    progressBar.stop();
}

module.exports = organizeDirectories;
