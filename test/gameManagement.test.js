const GameManagement = require('../src/gameManagement');
const scripts = require('../src/scripts');
const inquirer = require('inquirer');

const sinon = require('sinon');
const fs = require('fs');

describe('gameManagement', function() {
    let sandbox;
    let settings;
    before(async function() {
        settings = {};
        Object.assign(settings, {
            database: {
                database: 'nedb',
                nedbExtension: '',
            },
        });
    });

    beforeEach(async function() {
        sandbox = sinon.createSandbox();
    });

    afterEach(async function() {
        sandbox.verifyAndRestore();
    });

    it('creates settings.json based on sample when it does NOT exist and returns', async function() {
        const existsSync = sandbox.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sandbox.stub(fs, 'writeFileSync');
        const gameManagement = new GameManagement(settings);
        await gameManagement.main();
        sinon.assert.calledOnce(existsSync);
        sinon.assert.calledWithExactly(writeFileSync, './settings.json', '');
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
            sinon.assert.calledOnce(downloadSources);
            sinon.assert.calledOnce(selfTest);
            sinon.assert.calledOnce(convertDbToLaunchbox);

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
