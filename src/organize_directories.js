const files = require('./files');
const fs = require('fs');
const log = require('./logger');
const settings = require('./settings');
const inquirer = require('inquirer');

async function main() {
    log.info(`Reading ${settings.paths.unsortedGames}`);
    const foundFiles = await files.readDir(settings.paths.unsortedGames);

    const dlsiteFolder = `${settings.paths.unsortedGames}/DLSITE`;
    if (!fs.existsSync(dlsiteFolder)) {
        fs.mkdirSync(dlsiteFolder);
    }

    let current = 0;
    let lastFloor = 0;
    let gamesWithDuplicates = [];
    let scores = {};
    for (const file of foundFiles) {
        current++;
        const newFloor = Math.floor(current / foundFiles.length * 100);
        if(newFloor > lastFloor) {
            lastFloor = newFloor;
            log.info(`Processed ${newFloor}%`);
        }

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
            const RESULT_EXISTS_WEIGHT = 1;
            const ONLY_ONE_RESULT_EXISTS_WEIGHT = 1;
            const EXTRACTED_CODE_WEIGHT = 3;
            const EXTRACTED_CODE_MATCHING_RESULT_WEIGHT = 3;

            fileCodes.dlsite.foundCodes.forEach(code => {
                addCode(bossCodes, RESULT_EXISTS_WEIGHT, code.workno);
            });
            if (fileCodes.dlsite.foundCodes.length === 1) {
                addCode(bossCodes, ONLY_ONE_RESULT_EXISTS_WEIGHT, fileCodes.dlsite.foundCodes[0].workno);
            }

            fileCodes.getchu.foundCodes.works.forEach(code => {
                if (code.workno) {
                    addCode(bossCodes, RESULT_EXISTS_WEIGHT, code.workno[0]);
                }
            });
            if (fileCodes.getchu.foundCodes.works.length === 1) {
                addCode(bossCodes, ONLY_ONE_RESULT_EXISTS_WEIGHT, fileCodes.getchu.foundCodes.works[0].workno[0]);
            }
            if (extractedCode !== '') {
                addCode(bossCodes, EXTRACTED_CODE_WEIGHT, extractedCode);
                if (fileCodes.dlsite.foundCodes.find(fc => fc.workno === extractedCode)) {
                    addCode(bossCodes, EXTRACTED_CODE_MATCHING_RESULT_WEIGHT, extractedCode);
                }
            }
            let score = 0;
            const strippedName = files.removeTagsAndMetadata(fileCodes.file);
            const exactMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name === strippedName);
            const noSpacesExactMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name.replace(/ /gi, '') === strippedName.replace(/ /gi, ''));
            const similarMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name.includes(strippedName));
            const similarMatchSecondSide = fileCodes.dlsite.foundCodes.find(fc => strippedName.includes(fc.work_name));
            const noSpacesSimilarMatch = fileCodes.dlsite.foundCodes.find(fc => fc.work_name.replace(/ /gi, '').includes(strippedName.replace(/ /gi, '')));
            const noSpacesSimilarMatchSecondSide = fileCodes.dlsite.foundCodes.find(fc => strippedName.replace(/ /gi, '').includes(fc.work_name.replace(/ /gi, '')));

            const EXACT_MATCH_WEIGHT = 3;
            const NO_SPACE_EXACT_MATCH_WEIGHT = 3;
            const NO_SPACE_SIMILAR_MATCH_WEIGHT = 2;
            const NO_SPACE_SIMILAR_MATCH_SECOND_SIDE_WEIGHT = 2;
            const SIMILAR_MATCH_WEIGHT = 2;
            const SIMILAR_MATCH_SECOND_SIDE_WEIGHT = 2;

            if (exactMatch) {
                addCode(bossCodes, EXACT_MATCH_WEIGHT, exactMatch.workno);
                // log.info(`${strippedName} <=> ${exactMatch.work_name}`);
            }
            if (noSpacesExactMatch) {
                addCode(bossCodes, NO_SPACE_EXACT_MATCH_WEIGHT, noSpacesExactMatch.workno);
                // log.info(`${strippedName} <=> ${noSpacesExactMatch.work_name}`);
            }
            if (noSpacesSimilarMatch) {
                addCode(bossCodes, NO_SPACE_SIMILAR_MATCH_WEIGHT, noSpacesSimilarMatch.workno);
                // log.info(`${strippedName} <=> ${noSpacesSimilarMatch.work_name}`);
            }
            if (noSpacesSimilarMatchSecondSide) {
                addCode(bossCodes, NO_SPACE_SIMILAR_MATCH_SECOND_SIDE_WEIGHT, noSpacesSimilarMatchSecondSide.workno);
                // log.info(`${strippedName} <=> ${noSpacesSimilarMatchSecondSide.work_name}`);
            }
            if (similarMatch) {
                addCode(bossCodes, SIMILAR_MATCH_WEIGHT, similarMatch.workno);
                // log.info(`${strippedName} <=> ${similarMatch.work_name}`);
            }
            if (similarMatchSecondSide) {
                addCode(bossCodes, SIMILAR_MATCH_SECOND_SIDE_WEIGHT, similarMatchSecondSide.workno);
                // log.info(`${strippedName} <=> ${similarMatchSecondSide.work_name}`);
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

            let finalBossName = fileCodes.dlsite.foundCodes.find(fc => fc.workno === finalBossCode) ? fileCodes.dlsite.foundCodes.find(fc => fc.workno === finalBossCode).work_name : fileCodes.getchu.foundCodes.works.find(fc => {
                try {
                    return fc.workno && (fc.workno[0] === finalBossCode)
                } catch (e) {
                    log.info(fc);
                }
            });
            if (finalBossName && finalBossName.work_name) {
                finalBossName = finalBossName.work_name;
            }

            if (score > 2) {
                log.info(`Scoring finished`, {
                    file,
                    finalBossName,
                    score,
                    finalBossCode
                })
            }

            const MINIMUM_SCORE_TO_ASK = 1;
            const MINIMUM_SCORE_TO_ACCEPT = 4;
            const SHOULD_ASK = true;

            if (SHOULD_ASK && finalBossName && score > 0 && score >= MINIMUM_SCORE_TO_ASK && score < MINIMUM_SCORE_TO_ACCEPT) {
                let answer = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'same',
                    message: `Are \n* ${finalBossName} \n* ${file} \nthe same? \nCode ${finalBossCode}\n>`,
                }]);
                if (answer.same) {
                    score = 999;
                } else {
                    fileCodes.noMatch = true;
                    await files.writeFile(foundFilesPath, JSON.stringify(fileCodes, null, 4));
                }
            }

            if (score >= MINIMUM_SCORE_TO_ACCEPT) {
                const gameFolder = `${dlsiteFolder}/${finalBossCode}`;
                if (!fs.existsSync(gameFolder)) {
                    fs.mkdirSync(gameFolder);
                } else {
                    log.warn(`There is a duplicate`, finalBossCode);
                    gamesWithDuplicates.push(finalBossCode);
                }

                fs.renameSync(`${settings.paths.unsortedGames}/${file}`, `${gameFolder}/${file}`);
                log.debug(`Moved ${settings.paths.unsortedGames}/${file} to ${gameFolder}/${file}`);
            }

            // log.info(`Dlsite score for ${file} is ${dlsiteScore}`);
        } catch (e) {
            log.error('Error getting proper file codes', e);
            continue;
        }
    }
    log.info(`Found $files with dlsite score of at least 1 out of ${foundFiles.length}`, scores);
}

function addCode(bossCodes, CODE_WEIGHT, code) {
    const improvedCode = code.replace('RE', 'RJ');
    bossCodes[improvedCode] ? bossCodes[improvedCode] += CODE_WEIGHT : bossCodes[improvedCode] = CODE_WEIGHT;
}

main().catch(e => log.error(`Failure in main process`, e));