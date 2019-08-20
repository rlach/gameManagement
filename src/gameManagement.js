const inquirer = require('inquirer');
const log = require('./util/logger');
const scripts = require('./scripts');
const fs = require('fs');
const parserStrategies = require('./parsers');
const strategies = Object.values(parserStrategies);
const settingsSample = require('./settings-sample');
const { initDatabase } = require('./database/database');
const sleep = require('./util/sleep');
const Mapper = require('./util/mapper');

class GameManagement {
    constructor(settings, operation) {
        this.operation = operation;
        this.settings = settings;
    }

    async main() {
        this.database = await initDatabase(this.settings.database);
        this.mapper = new Mapper(
            this.settings.launchboxPlatform,
            this.settings.externalIdField,
            this.settings.preferredLanguage
        );

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

            let answer = { operation: this.operation };

            if (!answer.operation) {
                Object.assign(answer, await askForOperation());
            }

            log.debug('answer', answer);

            switch (answer.operation) {
                case 'getCodes':
                    await this.getPossibleCodes();
                    break;
                case 'organizeDirectories':
                    await this.organizeDirectories();
                    break;
                case 'launchboxToDb':
                    await this.syncLaunchboxToDb();
                    break;
                case 'buildDb':
                    await this.buildDatabaseFromFolders();
                    break;
                case 'dbToLaunchbox':
                    await this.convertDatabaseToLaunchbox();
                    break;
                case 'downloadImages':
                    await this.downloadImages();
                    break;
                case 'findDuplicates':
                    scripts.findPossibleDuplicates(this.settings.paths.main);
                    break;
                case 'setForceUpdate':
                    await scripts.setForceUpdate(this.database);
                    break;
                case 'syncAll':
                default:
                    await this.getPossibleCodes();
                    await this.organizeDirectories();
                    await this.syncLaunchboxToDb();
                    await this.buildDatabaseFromFolders();
                    await this.convertDatabaseToLaunchbox();
                    await this.downloadImages();
            }
        } finally {
            if (this.database) {
                await sleep(1);
                await this.database.close();
            }
        }
    }

    async getPossibleCodes() {
        await scripts.getPossibleCodes(
            strategies,
            this.settings.paths.unsortedGames
        );
    }

    async organizeDirectories() {
        await scripts.organizeDirectories(strategies, {
            paths: {
                targetSortFolder: this.settings.paths.targetSortFolder,
                unsortedGames: this.settings.paths.unsortedGames,
            },
            organizeDirectories: this.settings.organizeDirectories,
        });
    }

    async syncLaunchboxToDb() {
        await scripts.syncLaunchboxToDb(
            this.settings.paths.launchbox,
            this.settings.launchboxPlatform,
            this.settings.onlyUpdateNewer,
            this.database,
            this.mapper
        );
    }

    async buildDatabaseFromFolders() {
        await scripts.buildDbFromFolders(
            strategies,
            this.database,
            this.settings.paths.main,
            {
                maxSearchDepth: this.settings.exeSearchDepth,
                bannedFilenames: this.settings.bannedFilenames,
                executableExtensions: this.settings.executableExtensions,
            }
        );
    }

    async convertDatabaseToLaunchbox() {
        await scripts.convertDbToLaunchbox(
            this.settings.paths.launchbox,
            this.settings.launchboxPlatform,
            this.settings.paths.backup,
            this.settings.externalIdField,
            this.database,
            this.mapper
        );
    }

    async downloadImages() {
        await scripts.downloadImages(
            {
                launchboxPath: this.settings.paths.launchbox,
                launchboxPlatform: this.settings.launchboxPlatform,
            },
            this.database
        );
    }
}

async function askForOperation() {
    return inquirer.prompt([
        {
            type: 'list',
            name: 'operation',
            message: 'What operation do you want to perform?',
            choices: [
                new inquirer.Separator('= Main program ='),
                { name: '* Sync everything *', value: 'syncAll' },
                new inquirer.Separator('= partial operations ='),
                {
                    name: ' 1) get possible codes in unsorted directory',
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
                    name: ' 4) build/update database from organized games',
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
                    name: 'Find possible duplicates in organized games',
                    value: 'findDuplicates',
                },
                {
                    name: 'Mark games for force update of selected fields',
                    value: 'setForceUpdate',
                },
            ],
            default: 0,
        },
    ]);
}

module.exports = GameManagement;
