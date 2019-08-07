const cliProgress = require('cli-progress');
const fs = require('fs');
const log = require('../logger');
const settings = require('../settings');
const inquirer = require('inquirer');
const parserStrategies = require('../parsers');
const strategies = Object.values(parserStrategies);

async function organizeDirectories() {
    const progressBar = new cliProgress.Bar(
        {
            format: 'Organizing directories [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} directories'
        },
        cliProgress.Presets.shades_classic
    );
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
        progressBar.update(index + 1);
        const foundFilesPath = `${settings.paths.unsortedGames}/${file}/!foundCodes.txt`;
        if (!fs.existsSync(foundFilesPath)) {
            continue;
        }
        try {
            const fileCodes = JSON.parse(fs.readFileSync(foundFilesPath, 'utf8'));
            if (fileCodes.noMatch) {
                log.info(`File manually set as no match, ${file}`);
                continue;
            }

            let results = [];
            for (const strategy of strategies) {
                results.push(...strategy.scoreCodes(fileCodes[strategy.name], file));
            }
            const minScore = settings.organizeDirectories.shouldAsk
                ? settings.organizeDirectories.minimumScoreToAsk
                : settings.organizeDirectories.minimumScoreToAccept;
            results = results.filter(r => r.score >= minScore).sort((a, b) => b.score - a.score);

            if (results.length > 0) {
                let bestResult = results[0];

                if (
                    settings.organizeDirectories.shouldAsk &&
                    bestResult.name &&
                    bestResult.score > 0 &&
                    bestResult.score >= settings.organizeDirectories.minimumScoreToAsk &&
                    bestResult.score < settings.organizeDirectories.minimumScoreToAccept
                ) {
                    log.info(results, JSON.stringify(results, null, 4));

                    let answer = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'same',
                            message: `Are \n* ${bestResult.name} \n* ${file} \nthe same? \nCode ${
                                bestResult.code
                            }(score ${bestResult.score}, strategy ${bestResult.strategy})\n>`
                        }
                    ]);
                    if (answer.same) {
                        bestResult.accepted = true;
                    } else {
                        fileCodes.noMatch = true;
                        fs.writeFileSync(foundFilesPath, JSON.stringify(fileCodes, null, 4));
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
    progressBar.stop();
    log.debug(`Score summary for unsorted files`, scores);
}

module.exports = organizeDirectories;
