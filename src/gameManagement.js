const inquirer = require('inquirer');
const log = require('./util/logger');
const scripts = require('./scripts');
const fs = require('fs');
const parserStrategies = require('./parsers');
const settingsSample = require('./settings-sample');
const { initDatabase } = require('./database/database');
const sleep = require('./util/sleep');
const Mapper = require('./util/mapper');

class GameManagement {
    constructor(settings, operation) {
        this.operation = operation;
        this.settings = settings;

        this.strategies = [];
        Object.values(parserStrategies).forEach(strategy => {
            this.strategies.push(new strategy(this.settings));
        });
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
                case 'scanDirectories':
                    await this.scanDirectories();
                    break;
                case 'downloadSources':
                    await this.downloadSources();
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
                    await this.scanDirectories();
                    await this.downloadSources();
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
            this.strategies,
            this.settings.paths.unsortedGames
        );
    }

    async organizeDirectories() {
        await scripts.organizeDirectories(this.strategies, {
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

    async scanDirectories() {
        await scripts.scanDirectories(
            this.strategies,
            this.database,
            this.settings.paths.main,
            {
                maxSearchDepth: this.settings.exeSearchDepth,
                bannedFilenames: this.settings.bannedFilenames,
                executableExtensions: this.settings.executableExtensions,
            }
        );
    }

    async downloadSources() {
        await scripts.downloadSources(this.strategies, this.database);
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
                    name: ' 4) scan directories for file changes',
                    value: 'scanDirectories',
                },
                {
                    name: ' 5) download sources',
                    value: 'downloadSources',
                },
                {
                    name: ' 6) convert database to launchbox xml',
                    value: 'dbToLaunchbox',
                },
                {
                    name: ' 7) download images',
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
