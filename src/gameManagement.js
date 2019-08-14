const inquirer = require('inquirer');
const log = require('./logger');
const scripts = require('./scripts');
const fs = require('fs');
const parserStrategies = require('./parsers');
const strategies = Object.values(parserStrategies);
const settingsSample = require('./settings-sample');
const { initDatabase } = require('./database/database');

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
                await scripts.getPossibleCodes(
                    strategies,
                    settings.paths.unsortedGames
                );
                break;
            case 'organizeDirectories':
                await scripts.organizeDirectories(strategies, {
                    paths: {
                        targetSortFolder: settings.paths.targetSortFolder,
                        unsortedGames: settings.paths.unsortedGames,
                    },
                    organizeDirectories: settings.organizeDirectories,
                });
                break;
            case 'launchboxToDb':
                await scripts.syncLaunchboxToDb(database);
                break;
            case 'buildDb':
                await scripts.buildDbFromFolders(
                    strategies,
                    database,
                    settings.paths.main
                );
                break;
            case 'dbToLaunchbox':
                await scripts.convertDbToLaunchbox(database);
                break;
            case 'downloadImages':
                await scripts.downloadImages(
                    {
                        launchboxPath: settings.paths.launchbox,
                        launchboxPlatform: settings.launchboxPlatform,
                    },
                    database
                );
                break;
            case 'findDuplicates':
                await scripts.findPossibleDuplicates();
                break;
            case 'setForceUpdate':
                await scripts.setForceUpdate(database);
                break;
            case 'syncAll':
            default:
                await scripts.getPossibleCodes(
                    strategies,
                    settings.paths.unsortedGames
                );
                await scripts.organizeDirectories(strategies, {
                    paths: {
                        targetSortFolder: settings.paths.targetSortFolder,
                        unsortedGames: settings.paths.unsortedGames,
                    },
                    organizeDirectories: settings.organizeDirectories,
                });
                await scripts.syncLaunchboxToDb(database);
                await scripts.buildDbFromFolders(
                    strategies,
                    database,
                    settings.paths.main
                );
                await scripts.convertDbToLaunchbox(database);
                await scripts.downloadImages(
                    {
                        launchboxPath: settings.paths.launchbox,
                        launchboxPlatform: settings.launchboxPlatform,
                    },
                    database
                );
        }
    } finally {
        if (database) {
            await database.close();
        }
    }
}

module.exports = gameManagement;
