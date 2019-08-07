const fs = require('fs');
const log = require('../logger');
const settings = require('../settings');
const inquirer = require('inquirer');
const parserStrategies = require('../parsers');
const progress = require("../progress");
const strategies = Object.values(parserStrategies);

const operation = 'Organizing directories';

async function organizeDirectories() {
    const progressBar = progress.getBar(operation);
    log.debug(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = fs.readdirSync(settings.paths.unsortedGames);

    const targetFolder = `${settings.paths.targetSortFolder}`;
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    let gamesWithDuplicates = [];
    let scores = {};
    progressBar.start(foundFiles.length, 0);
    for (const [index, file] of foundFiles.entries()) {
        progress.updateName(progressBar, `${operation} [${file}]`);
        progressBar.update(index + 1);
        const foundFilesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;
        if (!fs.existsSync(foundFilesPath)) {
            continue;
        }
        try {
            const fileCodes = JSON.parse(fs.readFileSync(foundFilesPath, 'utf8'));
            if (fileCodes.noMatch) {
                log.debug(`File manually set as no match, ${file}`);
                continue;
            }

            let results = [];
            for (const strategy of strategies) {
                results.push(...strategy.scoreCodes(fileCodes[strategy.name], file));
            }
            const minScore = settings.organizeDirectories.shouldAsk
                ? settings.organizeDirectories.minimumScoreToAsk
                : settings.organizeDirectories.minimumScoreToAccept;
            results = results
                .filter(r => r.score >= minScore && r.name !== undefined)
                .sort((a, b) => b.score - a.score);

            if (results.length > 0) {
                let bestResult = results[0];
                if (
                    settings.organizeDirectories.shouldAsk &&
                    bestResult.score < settings.organizeDirectories.minimumScoreToAccept
                ) {
                    try {
                        bestResult = await confirmResults(results, file);
                    } catch (e) {
                        if (e.code === 'RESULT_REJECTED') {
                            fileCodes.noMatch = true;
                            fs.writeFileSync(foundFilesPath, JSON.stringify(fileCodes, null, 4));
                        }
                    }
                }

                if (bestResult.score >= settings.organizeDirectories.minimumScoreToAccept || bestResult.accepted) {
                    const gameFolder = `${targetFolder}/${bestResult.code}`;
                    if (!fs.existsSync(gameFolder)) {
                        fs.mkdirSync(gameFolder);
                    } else {
                        log.debug(`There is a duplicate`, bestResult.code);
                        gamesWithDuplicates.push(bestResult.code);
                    }

                    fs.renameSync(`${settings.paths.unsortedGames}/${file}`, `${gameFolder}/${file}`);
                    log.debug(`Moved ${settings.paths.unsortedGames}/${file} to ${gameFolder}/${file}`);
                }
            }
        } catch (e) {
            log.debug('Error getting proper file codes', e);
        }
    }
    progress.updateName(progressBar, operation);
    progressBar.stop();
    log.debug(`Score summary for unsorted files`, scores);
}

async function confirmResults(results, file) {
    if (results.length === 1) {
        return await confirmSingleResult(results, file);
    } else {
        return await confirmMultipleResults(results, file);
    }
}

async function confirmMultipleResults(results, file) {
    let bestResults = results.slice(0, settings.organizeDirectories.maxResultsToSuggest);
    const choices = [
        { name: 'None', value: 0 },
        ...bestResults.map((result, index) => ({
            name: `${result.name} (Score ${result.score}, ${result.strategy})`,
            value: index + 1
        }))
    ];

    let answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'same',
            default: 0,
            choices: choices,
            message: `Which result matches \n* ${file}?`
        }
    ]);

    if (answer.same === 0) {
        throw {
            message: 'Best result not accepted',
            code: 'RESULT_REJECTED'
        };
    }

    const bestResult = bestResults[answer.same - 1];
    bestResult.accepted = true;
    return bestResult;
}

async function confirmSingleResult(results, file) {
    let bestResult = results[0];

    let answer = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'same',
            message: `Are \n* ${bestResult.name} \n* ${file} \nthe same? \nCode ${bestResult.code}(score ${
                bestResult.score
            }, strategy ${bestResult.strategy})\n>`
        }
    ]);
    if (answer.same) {
        bestResult.accepted = true;
    } else {
        throw {
            message: 'Best result not accepted',
            code: 'RESULT_REJECTED'
        };
    }

    return bestResult;
}

module.exports = organizeDirectories;
