const log = require('../util/logger');
const eachLimit = require('async/eachLimit');
const inquirer = require('inquirer');
const progress = require('../util/progress');

async function selfTest(strategies) {
    const progressBar = progress.getBar('Self test');
    progressBar.start(strategies.length, 0);

    const results = [];
    await eachLimit(strategies, 5, async strategy => {
        results.push(...(await strategy.selfTest()));
        progressBar.increment();
    });

    progressBar.stop();

    const failedResults = results.filter(r => !r.passes);

    if (failedResults.length > 0) {
        failedResults.forEach(r => {
            log.info(
                `${r.strategy}. There were differences when trying to ${r.description}:`,
                r.diff
            );
        });

        if (failedResults.length > 0) {
            log.info(
                'Seems like either data on the sites changed or the design of the sites changed. Please review the difference and decide what to do.'
            );

            const response = await inquirer.prompt({
                type: 'confirm',
                name: 'continue',
                default: false,
                message: 'Do you want to perform sync anyway?',
            });

            if (!response.continue) {
                log.info(
                    'Please check if there is new version of Hisho available at https://github.com/rlach/gameManagement. If not please report issue with the differences above.'
                );
                process.exit();
            }
        }
    }
}

module.exports = { selfTest };
