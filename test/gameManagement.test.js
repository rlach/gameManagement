const GameManagement = require('../src/gameManagement');
const scripts = require('../src/scripts');
const inquirer = require('inquirer');
const config = require('../src/util/settings');

const sinon = require('sinon');
const fs = require('fs');

describe('gameManagement', function() {
    let sandbox;
    let settings;
    let validateSettingsSpy;
    before(async function() {
        settings = {};
        Object.assign(settings, {
            paths: {},
            organizeDirectories: {
                scores: {},
            },
            database: {
                database: 'nedb',
                nedbExtension: '',
            },
        });
    });

    beforeEach(async function() {
        sandbox = sinon.createSandbox();
        validateSettingsSpy = sandbox.stub(config, 'validate');
    });

    afterEach(async function() {
        sandbox.verifyAndRestore();
    });

    it('creates local.hjson based on sample when it does NOT exist and returns', async function() {
        const existsSync = sandbox.stub(fs, 'existsSync').returns(false);
        const copyFileSync = sandbox.stub(fs, 'copyFileSync');
        const gameManagement = new GameManagement(settings);
        await gameManagement.main();
        sinon.assert.calledOnce(existsSync);
        sinon.assert.calledOnce(validateSettingsSpy);
        sinon.assert.calledWithExactly(
            copyFileSync,
            './config/default.hjson',
            './config/local.hjson'
        );
    });

    describe('with operation given', function() {
        beforeEach(async function() {
            sandbox.stub(fs, 'existsSync').returns(true);
        });

        it('calls getPossibleCodes when getCodes', async function() {
            const getPossibleCodes = sandbox.stub(scripts, 'getPossibleCodes');
            const gameManagement = new GameManagement(settings, 'getCodes');
            await gameManagement.main();
            sinon.assert.calledOnce(getPossibleCodes);
        });

        it('calls organizeDirectories when organizeDirectories', async function() {
            const organizeDirectories = sandbox.stub(
                scripts,
                'organizeDirectories'
            );
            const gameManagement = new GameManagement(
                settings,
                'organizeDirectories'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(organizeDirectories);
        });

        it('calls syncLaunchboxToDb when launchboxToDb', async function() {
            const syncLaunchboxToDb = sandbox.stub(
                scripts,
                'syncLaunchboxToDb'
            );
            const gameManagement = new GameManagement(
                settings,
                'launchboxToDb'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(syncLaunchboxToDb);
        });

        it('calls downloadSources when downloadSources', async function() {
            const downloadSources = sandbox.stub(scripts, 'downloadSources');
            const gameManagement = new GameManagement(
                settings,
                'downloadSources'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(downloadSources);
        });

        it('calls selfTest when selfTest', async function() {
            const selfTest = sandbox.stub(scripts, 'selfTest');
            const gameManagement = new GameManagement(settings, 'selfTest');
            await gameManagement.main();
            sinon.assert.calledOnce(selfTest);
        });

        it('calls downloadImages when downloadImages', async function() {
            const downloadImages = sandbox.stub(scripts, 'downloadImages');
            const gameManagement = new GameManagement(
                settings,
                'downloadImages'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(downloadImages);
        });

        it('calls scanDirectories when scanDirectories', async function() {
            const scanDirectories = sandbox.stub(scripts, 'scanDirectories');
            const gameManagement = new GameManagement(
                settings,
                'scanDirectories'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(scanDirectories);
        });

        it('calls updateDpiSettings when updateDpiSettings', async function() {
            const updateDpiSettings = sandbox.stub(
                scripts,
                'updateDpiSettings'
            );
            const gameManagement = new GameManagement(
                settings,
                'updateDpiSettings'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(updateDpiSettings);
        });

        it('calls updateDpiSettings when forceDpiUpdate', async function() {
            const updateDpiSettings = sandbox.stub(
                scripts,
                'updateDpiSettings'
            );
            const gameManagement = new GameManagement(
                settings,
                'forceDpiUpdate'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(updateDpiSettings);
        });

        it('calls convertDbToLaunchbox when dbToLaunchbox', async function() {
            const convertDbToLaunchbox = sandbox.stub(
                scripts,
                'convertDbToLaunchbox'
            );
            const gameManagement = new GameManagement(
                settings,
                'dbToLaunchbox'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(convertDbToLaunchbox);
        });

        it('calls findPossibleDuplicates when findDuplicates', async function() {
            const findPossibleDuplicates = sandbox.stub(
                scripts,
                'findPossibleDuplicates'
            );
            const gameManagement = new GameManagement(
                settings,
                'findDuplicates'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(findPossibleDuplicates);
        });

        it('calls setForceUpdate when setForceUpdate', async function() {
            const setForceUpdate = sandbox.stub(scripts, 'setForceUpdate');
            const gameManagement = new GameManagement(
                settings,
                'setForceUpdate'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(setForceUpdate);
        });

        it('calls all syncing phases when syncAll', async function() {
            const getPossibleCodes = sandbox.stub(scripts, 'getPossibleCodes');
            const organizeDirectories = sandbox.stub(
                scripts,
                'organizeDirectories'
            );
            const syncLaunchboxToDb = sandbox.stub(
                scripts,
                'syncLaunchboxToDb'
            );
            const scanDirectories = sandbox.stub(scripts, 'scanDirectories');
            const updateDpi = sandbox.stub(scripts, 'updateDpiSettings');
            const downloadSources = sandbox.stub(scripts, 'downloadSources');
            const selfTest = sandbox.stub(scripts, 'selfTest');
            const convertDbToLaunchbox = sandbox.stub(
                scripts,
                'convertDbToLaunchbox'
            );

            const setForceUpdate = sandbox.stub(scripts, 'setForceUpdate');

            const gameManagement = new GameManagement(settings, 'syncAll');
            await gameManagement.main();
            sinon.assert.calledOnce(getPossibleCodes);
            sinon.assert.calledOnce(organizeDirectories);
            sinon.assert.calledOnce(syncLaunchboxToDb);
            sinon.assert.calledOnce(scanDirectories);
            sinon.assert.calledOnce(updateDpi);
            sinon.assert.calledOnce(downloadSources);
            sinon.assert.calledOnce(convertDbToLaunchbox);

            sinon.assert.notCalled(selfTest);
            sinon.assert.notCalled(setForceUpdate);
        });
    });

    describe('without operation given', function() {
        it('asks which scripts to use and runs it', async function() {
            sandbox.stub(fs, 'existsSync').returns(true);

            const getPossibleCodes = sandbox.stub(scripts, 'getPossibleCodes');
            const organizeDirectories = sandbox.stub(
                scripts,
                'organizeDirectories'
            );

            sandbox.stub(inquirer, 'prompt').resolves({
                operation: 'getCodes',
            });
            const gameManagement = new GameManagement(settings);
            await gameManagement.main();

            sinon.assert.calledOnce(getPossibleCodes);
            sinon.assert.notCalled(organizeDirectories);
        });
    });
});
