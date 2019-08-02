const cliProgress = require('cli-progress');
const files = require('../files');
const fs = require('fs');
const log = require('../logger');
const settings = require('../settings');
const inquirer = require('inquirer');

async function organizeDirectories() {
    const progressBar = new cliProgress.Bar({
        format: 'Organizing directories [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} directories'
    }, cliProgress.Presets.shades_classic);
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
            const bossCodes = {};
            let finalBossCode = '';
            const extractedCode = fileCodes.dlsite.extractedCode;

            fileCodes.dlsite.foundCodes.forEach(code => {
                addCode(bossCodes, settings.advanced.scores.resultExists, code.workno);
            });
            if (fileCodes.dlsite.foundCodes.length === 1) {
                addCode(bossCodes, settings.advanced.scores.onlyOneResultExists, fileCodes.dlsite.foundCodes[0].workno);
            }

            fileCodes.getchu.foundCodes.forEach(code => {
                if (code.workno) {
                    addCode(bossCodes, settings.advanced.scores.resultExists, code.workno[0]);
                }
            });
            if (fileCodes.getchu.foundCodes.length === 1) {
                addCode(bossCodes, settings.advanced.scores.onlyOneResultExists, fileCodes.getchu.foundCodes[0].workno[0]);
            }
            if (extractedCode !== '') {
                addCode(bossCodes, settings.advanced.scores.extractedDlsiteCode, extractedCode);
                if (fileCodes.dlsite.foundCodes.find(fc => fc.workno === extractedCode)) {
                    addCode(bossCodes, settings.advanced.scores.matchForExtractedDlsiteCode, extractedCode);
                }
            }
            let score = 0;
            const strippedName = files.removeTagsAndMetadata(fileCodes.file);
            const exactMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name === strippedName);
            const noSpacesExactMatch = fileCodes.dlsite.foundCodes.find(
                fc => fc.work_name.replace(/ /gi, '') === strippedName.replace(/ /gi, '')
            );
            const similarMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name.includes(strippedName));
            const similarMatchSecondSide = fileCodes.dlsite.foundCodes.find(fc => strippedName.includes(fc.work_name));
            const noSpacesSimilarMatch = fileCodes.dlsite.foundCodes.find(fc =>
                fc.work_name.replace(/ /gi, '').includes(strippedName.replace(/ /gi, ''))
            );
            const noSpacesSimilarMatchSecondSide = fileCodes.dlsite.foundCodes.find(fc =>
                strippedName.replace(/ /gi, '').includes(fc.work_name.replace(/ /gi, ''))
            );

            if (exactMatch) {
                addCode(bossCodes, settings.advanced.scores.exactMatch, exactMatch.workno);
            }
            if (noSpacesExactMatch) {
                addCode(bossCodes, settings.advanced.scores.noSpaceExactMatch, noSpacesExactMatch.workno);
            }
            if (noSpacesSimilarMatch) {
                addCode(bossCodes, settings.advanced.scores.similarMatch, noSpacesSimilarMatch.workno);
            }
            if (noSpacesSimilarMatchSecondSide) {
                addCode(bossCodes, settings.advanced.scores.noSpaceSimilarMatchSecondSide, noSpacesSimilarMatchSecondSide.workno);
            }
            if (similarMatch) {
                addCode(bossCodes, settings.advanced.scores.similarMatch, similarMatch.workno);
            }
            if (similarMatchSecondSide) {
                addCode(bossCodes, settings.advanced.scores.similarMatchSecondSide, similarMatchSecondSide.workno);
            }
            if (Object.keys(bossCodes).length > 0) {
                log.debug('Boss codes', bossCodes);

                let biggestBossKey = '';
                let biggestBossKeyScore = 0;
                Object.keys(bossCodes).forEach(bossKey => {
                    if (bossCodes[bossKey] > biggestBossKeyScore) {
                        biggestBossKey = bossKey;
                        biggestBossKeyScore = bossCodes[bossKey];
                    }
                });
                finalBossCode = biggestBossKey;
                score = biggestBossKeyScore;
            }
            if (scores[score]) {
                scores[score]++;
            } else {
                scores[score] = 1;
            }

            let finalBossName = fileCodes.dlsite.foundCodes.find(fc => fc.workno === finalBossCode)
                ? fileCodes.dlsite.foundCodes.find(fc => fc.workno === finalBossCode).work_name
                : fileCodes.getchu.foundCodes.find(fc => {
                      try {
                          return fc.workno && fc.workno[0] === finalBossCode;
                      } catch (e) {
                          log.debug(`getchu found code error`, fc);
                      }
                  });
            if (finalBossName && finalBossName.work_name) {
                finalBossName = finalBossName.work_name;
            }

            if (score > 2) {
                log.debug(`Scoring finished`, {
                    file,
                    finalBossName,
                    score,
                    finalBossCode
                });
            }

            if (
                settings.organizeDirectories.shouldAsk &&
                finalBossName &&
                score > 0 &&
                score >= settings.organizeDirectories.minimumScoreToAsk &&
                score < settings.organizeDirectories.minimumScoreToAccept
            ) {
                let answer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'same',
                        message: `Are \n* ${finalBossName} \n* ${file} \nthe same? \nCode ${finalBossCode}\n>`
                    }
                ]);
                if (answer.same) {
                    score = 999;
                } else {
                    fileCodes.noMatch = true;
                    fs.writeFileSync(foundFilesPath, JSON.stringify(fileCodes, null, 4));
                }
            }

            if (score >= settings.organizeDirectories.minimumScoreToAccept) {
                const gameFolder = `${targetFolder}/${finalBossCode}`;
                if (!fs.existsSync(gameFolder)) {
                    fs.mkdirSync(gameFolder);
                } else {
                    log.debug(`There is a duplicate`, finalBossCode);
                    gamesWithDuplicates.push(finalBossCode);
                }

                fs.renameSync(`${settings.paths.unsortedGames}/${file}`, `${gameFolder}/${file}`);
                log.debug(`Moved ${settings.paths.unsortedGames}/${file} to ${gameFolder}/${file}`);
            }
        } catch (e) {
            log.debug('Error getting proper file codes', e);
        }
        progressBar.update(index + 1);
    }
    progressBar.stop();
    log.debug(`Score summary for unsorted files`, scores);
}

function addCode(bossCodes, CODE_WEIGHT, code) {
    const improvedCode = code.replace('RE', 'RJ');
    bossCodes[improvedCode] ? (bossCodes[improvedCode] += CODE_WEIGHT) : (bossCodes[improvedCode] = CODE_WEIGHT);
}

module.exports = organizeDirectories;
