const inquirer = require('inquirer');

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
            name: `${result.name ? result.name : result.code + '(code extracted from filename)'} (Score ${
                result.score
                }, ${result.strategy})`,
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
            message: bestResult.name
                ? `Are \n* ${bestResult.name} \n* ${file} \nthe same? \nCode ${bestResult.code}(score ${
                    bestResult.score
                    }, strategy ${bestResult.strategy})\n>`
                : `Is ${bestResult.code} proper for ${file}? (Code extracted from filename) (score ${
                    bestResult.score
                    }, strategy ${bestResult.strategy})`
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

module.exports = { confirmResults };