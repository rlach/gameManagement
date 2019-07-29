const inquirer = require('inquirer');
const log = require('./logger');
const scripts = require('./scripts');
const { db } = require('./database/mongoose');

async function main() {
    let answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'operation',
            message: 'What operation do you want to perform?',
            choices: [
                'sync all',
                'get possible codes',
                'organize directories',
                'sync launchbox to db',
                'build db from folders',
                'convert db to launchbox'
            ],
            default: 0
        }
    ]);
    switch (answer.operation) {
        case 'get possible codes':
            await scripts.getPossibleCodes();
            break;
        case 'organize directories':
            await scripts.organizeDirectories();
            break;
        case 'sync launchbox to db':
            await scripts.syncLaunchboxToDb();
            break;
        case 'build db from folders':
            await scripts.buildDbFromFolders();
            break;
        case 'convert db to launchbox':
            await scripts.convertDbToLaunchbox();
            break;
        case 'sync all':
        default:
            await scripts.getPossibleCodes();
            await scripts.organizeDirectories();
            await scripts.syncLaunchboxToDb();
            await scripts.buildDbFromFolders();
            await scripts.convertDbToLaunchbox();
    }
}

main().catch(e => {
    log.error(`Failure in main process`, e);
    db.close();
});