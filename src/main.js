const inquirer = require('inquirer');
const log = require('./logger');
const scripts = require('./scripts');
const { db } = require('./database/mongoose');
const vndb = require('./vndb');
const fs = require('fs');
const settings = require('./settings-sample');

async function main() {
    if (!fs.existsSync('./settings.json')) {
        fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 4));
        log.info('Settings file created. Please update it to your settings and run script again.');
        return;
    }

    let answer = {};

    process.argv.forEach(function(val, index, array) {
        const command = val.split('=');
        if (command.length === 2) {
            if (command[0] === 'script') {
                answer.operation = command[1];
            }
        }
    });

    if (!answer.operation) {
        Object.assign(
            answer,
            await inquirer.prompt([
                {
                    type: 'list',
                    name: 'operation',
                    message: 'What operation do you want to perform?',
                    choices: [
                        new inquirer.Separator('= Main program ='),
                        { name: '* Sync everything *', value: 'syncAll' },
                        new inquirer.Separator('= partial operations ='),
                        { name: ' 1) get possible codes in unsorted directory', value: 'getCodes' },
                        { name: ' 2) organize unsorted directory', value: 'organizeDirectories' },
                        { name: ' 3) sync launchbox xml to database', value: 'launchboxToDb' },
                        { name: ' 4) build/update database from organized games', value: 'buildDb' },
                        { name: ' 5) convert database to launchbox xml', value: 'dbToLaunchbox' },
                        new inquirer.Separator('= Helper tools ='),
                        { name: 'Find possible duplicates in organized games', value: 'findDuplicates' },
                        { name: 'Mark games for force update of selected fields', value: 'setForceUpdate' }
                    ],
                    default: 0
                }
            ])
        );
    }

    log.debug('answer', answer);

    switch (answer.operation) {
        case 'getCodes':
            await scripts.getPossibleCodes();
            break;
        case 'organizeDirectories':
            await scripts.organizeDirectories();
            break;
        case 'launchboxToDb':
            await scripts.syncLaunchboxToDb();
            break;
        case 'buildDb':
            await scripts.buildDbFromFolders();
            break;
        case 'dbToLaunchbox':
            await scripts.convertDbToLaunchbox();
            break;
        case 'findDuplicates':
            await scripts.findPossibleDuplicates();
            break;
        case 'setForceUpdate':
            await scripts.setForceUpdate();
            break;
        case 'syncAll':
        default:
            await scripts.getPossibleCodes();
            await scripts.organizeDirectories();
            await scripts.syncLaunchboxToDb();
            await scripts.buildDbFromFolders();
            await scripts.convertDbToLaunchbox();
    }
}

main()
    .catch(e => {
        log.error(`Failure in main process`, e);
    })
    .finally(async () => {
        db.close();
        await vndb.disconnect();
    });
