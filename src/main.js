const inquirer = require('inquirer');
const log = require('./logger');
const scripts = require('./scripts');
const { db } = require('./database/mongoose');
const vndb = require('./parsers/vndb');
const fs = require('fs');
const settings = require('./settings-sample');

async function main() {
    if(!fs.existsSync('./settings.json')) {
        fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 4));
        log.info('Settings file created. Please update it to your settings and run script again.')
        return;
    }

    let script;

    process.argv.forEach(function (val, index, array) {
        const command = val.split('=');
        if(command.length === 2) {
            if(command[0] === 'script') {
                script = command[1];
            }
        }
    });

    if(script) {
        switch (script) {
            case 'get possible codes':
                await scripts.getPossibleCodes();
                break;
            case 'organize directories':
                await scripts.organizeDirectories();
                break;
            case 'sync launchbox to db':
                await scripts.syncLaunchboxToDb();
                break;
            case 'buildDb':
                await scripts.buildDbFromFolders();
                break;
            case 'dbToLaunchbox':
                await scripts.convertDbToLaunchbox();
                break;
            case 'find possible duplicates':
                await scripts.findPossibleDuplicates();
                break;
            case 'sync all':
            default:
                await scripts.getPossibleCodes();
                await scripts.organizeDirectories();
                await scripts.syncLaunchboxToDb();
                await scripts.buildDbFromFolders();
                await scripts.convertDbToLaunchbox();
        }
    } else {
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
                    'convert db to launchbox',
                    'find possible duplicates'
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
            case 'find possible duplicates':
                await scripts.findPossibleDuplicates();
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
}

main().catch(e => {
    log.error(`Failure in main process`, e);
}).finally(async () => {
    db.close()
    await vndb.disconnect();
});