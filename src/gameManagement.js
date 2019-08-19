const inquirer = require('inquirer');
const log = require('./util/logger');
const scripts = require('./scripts');
const fs = require('fs');
const parserStrategies = require('./parsers');
const strategies = Object.values(parserStrategies);
const settingsSample = require('./settings-sample');
const { initDatabase } = require('./database/database');
const sleep = require('./util/sleep');

async function gameManagement(settings, operation) {
    let database = await initDatabase(settings.database);
    try {
        if (!fs.existsSync('./settings.json')) {
            fs.writeFileSync(
                './settings.json',
                JSON.stringify(settingsSample, null, 4)
            );
            log.info(
                'Settings file created. Please update it to your settings and run script again.'
            );
            return;
        }

        let answer = { operation };

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
                            {
                                name:
                                    ' 1) get possible codes in unsorted directory',
                                value: 'getCodes',
                            },
                            {
                                name: ' 2) organize unsorted directory',
                                value: 'organizeDirectories',
                            },
                            {
                                name: ' 3) sync launchbox xml to database',
                                value: 'launchboxToDb',
                            },
                            {
                                name:
                                    ' 4) build/update database from organized games',
                                value: 'buildDb',
                            },
                            {
                                name: ' 5) convert database to launchbox xml',
                                value: 'dbToLaunchbox',
                            },
                            {
                                name: ' 6) download images',
                                value: 'downloadImages',
                            },
                            new inquirer.Separator('= Helper tools ='),
                            {
                                name:
                                    'Find possible duplicates in organized games',
                                value: 'findDuplicates',
                            },
                            {
                                name:
                                    'Mark games for force update of selected fields',
                                value: 'setForceUpdate',
                            },
                        ],
                        default: 0,
                    },
                ])
            );
        }

        log.debug('answer', answer);

        switch (answer.operation) {
            case 'getCodes':
                await getPossibleCodes(settings);
                break;
            case 'organizeDirectories':
                await organizeDirectories(settings);
                break;
            case 'launchboxToDb':
                await syncLaunchboxToDb(settings, database);
                break;
            case 'buildDb':
                await buildDatabaseFromFolders(settings, database);
                break;
            case 'dbToLaunchbox':
                await convertDatabaseToLaunchbox(settings, database);
                break;
            case 'downloadImages':
                await downloadImages(settings, database);
                break;
            case 'findDuplicates':
                scripts.findPossibleDuplicates(settings.paths.main);
                break;
            case 'setForceUpdate':
                await scripts.setForceUpdate(database);
                break;
            case 'syncAll':
            default:
                await getPossibleCodes(settings);
                await organizeDirectories(settings);
                await syncLaunchboxToDb(settings, database);
                await buildDatabaseFromFolders(settings, database);
                await convertDatabaseToLaunchbox(settings, database);
                await downloadImages(settings, database);
        }
    } finally {
        if (database) {
            await sleep(1);
            await database.close();
        }
    }
}

async function getPossibleCodes(settings) {
    await scripts.getPossibleCodes(strategies, settings.paths.unsortedGames);
}

async function organizeDirectories(settings) {
    await scripts.organizeDirectories(strategies, {
        paths: {
            targetSortFolder: settings.paths.targetSortFolder,
            unsortedGames: settings.paths.unsortedGames,
        },
        organizeDirectories: settings.organizeDirectories,
    });
}

async function syncLaunchboxToDb(settings, database) {
    await scripts.syncLaunchboxToDb(
        settings.paths.launchbox,
        settings.launchboxPlatform,
        settings.onlyUpdateNewer,
        database
    );
}

async function buildDatabaseFromFolders(settings, database) {
    await scripts.buildDbFromFolders(
        strategies,
        database,
        settings.paths.main,
        {
            maxSearchDepth: settings.exeSearchDepth,
            bannedFilenames: settings.bannedFilenames,
            executableExtensions: settings.executableExtensions,
        }
    );
}

async function convertDatabaseToLaunchbox(settings, database) {
    await scripts.convertDbToLaunchbox(
        settings.paths.launchbox,
        settings.launchboxPlatform,
        settings.paths.backup,
        settings.externalIdField,
        database
    );
}

async function downloadImages(settings, database) {
    await scripts.downloadImages(
        {
            launchboxPath: settings.paths.launchbox,
            launchboxPlatform: settings.launchboxPlatform,
        },
        database
    );
}

module.exports = gameManagement;
