const sinon = require('sinon');
const fs = require('fs');
const files = require('../../src/util/files');
const progress = require('../../src/util/progress');
const moment = require('moment');
const convert = require('xml-js');
const { initDatabase } = require('../../src/database/database');
const mapper = require('../../src/util/mapper');

const convertDbToLaunchbox = require('../../src/scripts/convert_db_to_launchbox/convert_db_to_launchbox');
const externalXmlProperties = require('../../src/scripts/convert_db_to_launchbox/external_launchbox_properties');

describe('convertDbToLaunchbox', function() {
    const launchboxGameId = 'uuid';
    const xmlFullPath = 'launchboxPath/Data/Platforms/PLATFORM.xml';
    const emptyXml =
        '<?xml version="1.0" standalone="yes"?><LaunchBox></LaunchBox>';
    const launchboxPath = 'launchboxPath';
    const launchboxPlatform = 'PLATFORM';
    const backupPath = 'backupPath';
    let externalIdField;
    let progressBarUpdate;
    let settings;
    let database;
    let strategies;
    let writeFileStub;

    beforeEach(async () => {
        sinon.stub(files, 'createMissingLaunchboxDirectories');
        externalIdField = 'Status';
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });

        strategies = [];
        settings = {
            paths: {
                targetSortFolder: './target',
                unsortedGames: './mess',
            },
        };
        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            update: progressBarUpdate,
            stop: sinon.spy(),
        });
        writeFileStub = sinon.stub(fs, 'writeFileSync');
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Writes xml with main node when database is empty', async () => {
        await convertDbToLaunchbox(
            launchboxPath,
            launchboxPlatform,
            backupPath,
            externalIdField,
            database
        );
        sinon.assert.calledWithExactly(writeFileStub, xmlFullPath, emptyXml);
    });

    it('Backups existing xml file if it exists', async () => {
        sinon.stub(fs, 'existsSync').returns(true);
        const copyFileStub = sinon.stub(fs, 'copyFileSync');
        sinon.stub(fs, 'readFileSync').returns(emptyXml);
        await convertDbToLaunchbox(
            launchboxPath,
            launchboxPlatform,
            backupPath,
            externalIdField,
            database
        );
        sinon.assert.calledWithExactly(
            copyFileStub,
            xmlFullPath,
            'backupPath/PLATFORM-backup.xml'
        );
        sinon.assert.calledWithExactly(writeFileStub, xmlFullPath, emptyXml);
    });

    it('Skips deleted games from database', async () => {
        const game = await database.game.retrieveFromDb(1);
        game.deleted = true;
        await database.game.save(game);
        await convertDbToLaunchbox(
            launchboxPath,
            launchboxPlatform,
            backupPath,
            externalIdField,
            database
        );
        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.calledWithExactly(writeFileStub, xmlFullPath, emptyXml);
    });

    describe('converts database game to xml', () => {
        let gameDates;

        beforeEach(async () => {
            const date = moment('1986-01-01', 'YYYY-MM-DD').format();
            gameDates = {
                launchboxId: launchboxGameId,
                dateAdded: date,
                dateModified: date,
                lastPlayedDate: date,
            };
        });

        it('creates new entry when game does not exist in xml and adds external properties to it', async () => {
            const xmlGame = {
                DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
            };
            const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
            const js2xmlStub = sinon.spy(convert, 'js2xml');
            const game = await database.game.retrieveFromDb(1);
            await database.game.updateMany({}, gameDates);

            await convertDbToLaunchbox(
                launchboxPath,
                launchboxPlatform,
                backupPath,
                externalIdField,
                database
            );

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledWithExactly(mapperStub, {
                _id: game._id,
                ...gameDates,
            });
            sinon.assert.calledWithExactly(
                js2xmlStub,
                {
                    LaunchBox: {
                        CustomField: [],
                        Game: [{ ...xmlGame, ...externalXmlProperties }],
                    },
                    _declaration: {
                        _attributes: { standalone: 'yes', version: '1.0' },
                    },
                },
                { compact: true }
            );
            sinon.assert.calledWithExactly(
                writeFileStub,
                xmlFullPath,
                '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><DateAdded>1986-01-01T00:00:00+01:00</DateAdded><CommandLine/><ConfigurationCommandLine/><ConfigurationPath/><DosBoxConfigurationPath/><Emulator/><ManualPath/><MusicPath/><Publisher/><ScummVMAspectCorrection>false</ScummVMAspectCorrection><ScummVMFullscreen>false</ScummVMFullscreen><ScummVMGameDataFolderPath/><ScummVMGameType/><UseDosBox>false</UseDosBox><UseScummVM>false</UseScummVM><PlayMode/><Region/><VideoPath/><MissingVideo>true</MissingVideo><MissingBoxFrontImage>false</MissingBoxFrontImage><MissingScreenshotImage>false</MissingScreenshotImage><MissingClearLogoImage>false</MissingClearLogoImage><MissingBackgroundImage>false</MissingBackgroundImage><UseStartupScreen>false</UseStartupScreen><HideAllNonExclusiveFullscreenWindows>false</HideAllNonExclusiveFullscreenWindows><StartupLoadDelay>0</StartupLoadDelay><HideMouseCursorInGame>false</HideMouseCursorInGame><DisableShutdownScreen>false</DisableShutdownScreen><AggressiveWindowHiding>false</AggressiveWindowHiding><OverrideDefaultStartupScreenSettings>false</OverrideDefaultStartupScreenSettings><UsePauseScreen>false</UsePauseScreen><OverrideDefaultPauseScreenSettings>false</OverrideDefaultPauseScreenSettings><SuspendProcessOnPause>false</SuspendProcessOnPause><ForcefulPauseScreenActivation>false</ForcefulPauseScreenActivation><CustomDosBoxVersionPath/></Game></LaunchBox>'
            );
        });

        it('updates old entry when game exists in xml', async () => {
            sinon.stub(fs, 'existsSync').returns(true);
            sinon.stub(fs, 'copyFileSync');
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>${launchboxGameId}</ID><SomethingElse>else</SomethingElse></Game></LaunchBox>`
                );

            const xmlGame = {
                DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
                ID: { _text: launchboxGameId },
            };
            const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
            const js2xmlStub = sinon.spy(convert, 'js2xml');
            const game = await database.game.retrieveFromDb(1);
            await database.game.updateMany({}, gameDates);

            await convertDbToLaunchbox(
                launchboxPath,
                launchboxPlatform,
                backupPath,
                externalIdField,
                database
            );

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledWithExactly(mapperStub, {
                _id: game._id,
                ...gameDates,
            });
            sinon.assert.calledWithExactly(
                js2xmlStub,
                {
                    LaunchBox: {
                        CustomField: [],
                        Game: [
                            { ...xmlGame, SomethingElse: { _text: 'else' } },
                        ],
                    },
                    _declaration: {
                        _attributes: { standalone: 'yes', version: '1.0' },
                    },
                },
                { compact: true }
            );
            sinon.assert.calledWithExactly(
                writeFileStub,
                xmlFullPath,
                '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>uuid</ID><SomethingElse>else</SomethingElse><DateAdded>1986-01-01T00:00:00+01:00</DateAdded></Game></LaunchBox>'
            );
        });

        describe('custom fields', () => {
            it('preserves existing custom fields', async () => {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon.stub(fs, 'copyFileSync');
                sinon
                    .stub(fs, 'readFileSync')
                    .returns(
                        `<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>${launchboxGameId}</ID></Game><CustomField><GameID>uuid</GameID><Name>foo</Name><Value>bar</Value></CustomField></LaunchBox>`
                    );

                const xmlGame = {
                    DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
                    ID: { _text: launchboxGameId },
                };
                const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
                const js2xmlStub = sinon.spy(convert, 'js2xml');
                const game = await database.game.retrieveFromDb(1);
                await database.game.updateMany({}, gameDates);

                await convertDbToLaunchbox(
                    launchboxPath,
                    launchboxPlatform,
                    backupPath,
                    externalIdField,
                    database
                );

                sinon.assert.calledOnce(progressBarUpdate);
                sinon.assert.calledWithExactly(mapperStub, {
                    _id: game._id,
                    ...gameDates,
                });
                sinon.assert.calledWithExactly(
                    js2xmlStub,
                    {
                        LaunchBox: {
                            CustomField: [
                                {
                                    GameID: { _text: 'uuid' },
                                    Name: { _text: 'foo' },
                                    Value: { _text: 'bar' },
                                },
                            ],
                            Game: [{ ...xmlGame }],
                        },
                        _declaration: {
                            _attributes: { standalone: 'yes', version: '1.0' },
                        },
                    },
                    { compact: true }
                );
                sinon.assert.calledWithExactly(
                    writeFileStub,
                    xmlFullPath,
                    '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>uuid</ID><DateAdded>1986-01-01T00:00:00+01:00</DateAdded></Game><CustomField><GameID>uuid</GameID><Name>foo</Name><Value>bar</Value></CustomField></LaunchBox>'
                );
            });

            it('adds engine custom field when engine exists on database game', async () => {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon.stub(fs, 'copyFileSync');
                sinon
                    .stub(fs, 'readFileSync')
                    .returns(
                        `<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>${launchboxGameId}</ID><SomethingElse>else</SomethingElse></Game></LaunchBox>`
                    );

                const xmlGame = {
                    DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
                    ID: { _text: launchboxGameId },
                };
                const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
                const js2xmlStub = sinon.spy(convert, 'js2xml');
                const game = await database.game.retrieveFromDb(1);
                await database.game.updateMany(
                    {},
                    {
                        ...gameDates,
                        engine: 'rocketEngine',
                    }
                );

                await convertDbToLaunchbox(
                    launchboxPath,
                    launchboxPlatform,
                    backupPath,
                    externalIdField,
                    database
                );

                sinon.assert.calledOnce(progressBarUpdate);
                sinon.assert.calledWithExactly(mapperStub, {
                    _id: game._id,
                    ...gameDates,
                    engine: 'rocketEngine',
                });
                sinon.assert.calledWithExactly(
                    js2xmlStub,
                    {
                        LaunchBox: {
                            CustomField: [
                                {
                                    GameID: { _text: 'uuid' },
                                    Name: { _text: 'engine' },
                                    Value: { _text: 'rocketEngine' },
                                },
                            ],
                            Game: [
                                {
                                    ...xmlGame,
                                    SomethingElse: { _text: 'else' },
                                },
                            ],
                        },
                        _declaration: {
                            _attributes: { standalone: 'yes', version: '1.0' },
                        },
                    },
                    { compact: true }
                );
                sinon.assert.calledWithExactly(
                    writeFileStub,
                    xmlFullPath,
                    '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>uuid</ID><SomethingElse>else</SomethingElse><DateAdded>1986-01-01T00:00:00+01:00</DateAdded></Game><CustomField><GameID>uuid</GameID><Name>engine</Name><Value>rocketEngine</Value></CustomField></LaunchBox>'
                );
            });

            it('updates existing custom field when related value exists on database game', async () => {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon.stub(fs, 'copyFileSync');
                sinon
                    .stub(fs, 'readFileSync')
                    .returns(
                        `<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>${launchboxGameId}</ID></Game><CustomField><GameID>uuid</GameID><Name>engine</Name><Value>rocketEngine</Value></CustomField></LaunchBox>`
                    );

                const xmlGame = {
                    DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
                    ID: { _text: launchboxGameId },
                };
                const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
                const js2xmlStub = sinon.spy(convert, 'js2xml');
                const game = await database.game.retrieveFromDb(1);
                await database.game.updateMany(
                    {},
                    {
                        ...gameDates,
                        engine: 'betterEngine',
                    }
                );

                await convertDbToLaunchbox(
                    launchboxPath,
                    launchboxPlatform,
                    backupPath,
                    externalIdField,
                    database
                );

                sinon.assert.calledOnce(progressBarUpdate);
                sinon.assert.calledWithExactly(mapperStub, {
                    _id: game._id,
                    ...gameDates,
                    engine: 'betterEngine',
                });
                sinon.assert.calledWithExactly(
                    js2xmlStub,
                    {
                        LaunchBox: {
                            CustomField: [
                                {
                                    GameID: { _text: 'uuid' },
                                    Name: { _text: 'engine' },
                                    Value: { _text: 'betterEngine' },
                                },
                            ],
                            Game: [{ ...xmlGame }],
                        },
                        _declaration: {
                            _attributes: { standalone: 'yes', version: '1.0' },
                        },
                    },
                    { compact: true }
                );
                sinon.assert.calledWithExactly(
                    writeFileStub,
                    xmlFullPath,
                    '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><ID>uuid</ID><DateAdded>1986-01-01T00:00:00+01:00</DateAdded></Game><CustomField><GameID>uuid</GameID><Name>engine</Name><Value>betterEngine</Value></CustomField></LaunchBox>'
                );
            });
        });

        it('stores externalId field in CustomField when settings are set to it', async () => {
            const xmlGame = {
                DateAdded: { _text: '1986-01-01T00:00:00+01:00' },
                ID: { _text: launchboxGameId },
            };
            const mapperStub = sinon.stub(mapper, 'map').returns(xmlGame);
            const js2xmlStub = sinon.spy(convert, 'js2xml');
            const game = await database.game.retrieveFromDb(1);
            await database.game.updateMany(
                {},
                {
                    $set: {
                        ...gameDates,
                    },
                }
            );

            await convertDbToLaunchbox(
                launchboxPath,
                launchboxPlatform,
                backupPath,
                'CustomField',
                database
            );

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledWithExactly(mapperStub, {
                _id: game._id,
                id: game.id,
                ...gameDates,
            });
            sinon.assert.calledWithExactly(
                js2xmlStub,
                {
                    LaunchBox: {
                        CustomField: [
                            {
                                GameID: { _text: 'uuid' },
                                Name: { _text: 'externalId' },
                                Value: { _text: 1 },
                            },
                        ],
                        Game: [{ ...xmlGame, ...externalXmlProperties }],
                    },
                    _declaration: {
                        _attributes: { standalone: 'yes', version: '1.0' },
                    },
                },
                { compact: true }
            );
            sinon.assert.calledWithExactly(
                writeFileStub,
                xmlFullPath,
                '<?xml version="1.0" standalone="yes"?><LaunchBox><Game><DateAdded>1986-01-01T00:00:00+01:00</DateAdded><ID>uuid</ID><CommandLine/><ConfigurationCommandLine/><ConfigurationPath/><DosBoxConfigurationPath/><Emulator/><ManualPath/><MusicPath/><Publisher/><ScummVMAspectCorrection>false</ScummVMAspectCorrection><ScummVMFullscreen>false</ScummVMFullscreen><ScummVMGameDataFolderPath/><ScummVMGameType/><UseDosBox>false</UseDosBox><UseScummVM>false</UseScummVM><PlayMode/><Region/><VideoPath/><MissingVideo>true</MissingVideo><MissingBoxFrontImage>false</MissingBoxFrontImage><MissingScreenshotImage>false</MissingScreenshotImage><MissingClearLogoImage>false</MissingClearLogoImage><MissingBackgroundImage>false</MissingBackgroundImage><UseStartupScreen>false</UseStartupScreen><HideAllNonExclusiveFullscreenWindows>false</HideAllNonExclusiveFullscreenWindows><StartupLoadDelay>0</StartupLoadDelay><HideMouseCursorInGame>false</HideMouseCursorInGame><DisableShutdownScreen>false</DisableShutdownScreen><AggressiveWindowHiding>false</AggressiveWindowHiding><OverrideDefaultStartupScreenSettings>false</OverrideDefaultStartupScreenSettings><UsePauseScreen>false</UsePauseScreen><OverrideDefaultPauseScreenSettings>false</OverrideDefaultPauseScreenSettings><SuspendProcessOnPause>false</SuspendProcessOnPause><ForcefulPauseScreenActivation>false</ForcefulPauseScreenActivation><CustomDosBoxVersionPath/></Game><CustomField><GameID>uuid</GameID><Name>externalId</Name><Value>1</Value></CustomField></LaunchBox>'
            );
        });
    });
});
