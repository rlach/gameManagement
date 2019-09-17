/* istanbul ignore file */
const GameManagement = require('./gameManagement');
const vndb = require('./util/vndb');
const config = require('../node_modules/config');
const log = require('./util/logger');
const inquirer = require('inquirer');

async function main() {
    await vndb.connect();

    let operation;
    process.argv.forEach(function(val) {
        const command = val.split('=');
        if (command.length === 2) {
            if (command[0] === 'script') {
                operation = command[1];
            }
        }
    });

    const gameManagement = new GameManagement(config, operation);
    await gameManagement.main();

    await inquirer.prompt([
        {
            type: 'input',
            name: 'whatever',
            message: 'Press enter to continue',
        },
    ]);
}

main()
    .catch(e => {
        log.error(`Failure in main process`, e);
    })
    .finally(async () => {
        await vndb.disconnect();
    });
