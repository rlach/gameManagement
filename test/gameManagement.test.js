const GameManagement = require('../src/gameManagement');
const settingsSample = require('../src/settings-sample');
const scripts = require('../src/scripts');
const inquirer = require('inquirer');

const sinon = require('sinon');
const fs = require('fs');

describe('gameManagement', function() {
    let sandbox;
    let settings;
    before(async () => {
        settings = {};
        Object.assign(settings, settingsSample);
        Object.assign(settings, {
            database: {
                database: 'nedb',
                nedbExtension: '',
            },
        });
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.verifyAndRestore();
    });

    it('creates settings.json based on sample when it does NOT exist and returns', async () => {
        const existsSync = sandbox.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sandbox.stub(fs, 'writeFileSync');
        const gameManagement = new GameManagement(settings);
        await gameManagement.main();
        sinon.assert.calledOnce(existsSync);
        sinon.assert.calledWithExactly(
            writeFileSync,
            './settings.json',
            JSON.stringify(settingsSample, null, 4)
        );
    });

    describe('with operation given', () => {
        beforeEach(async () => {
            sandbox.stub(fs, 'existsSync').returns(true);
        });

        it('calls getPossibleCodes when getCodes', async () => {
            const getPossibleCodes = sandbox.stub(scripts, 'getPossibleCodes');
            const gameManagement = new GameManagement(settings, 'getCodes');
            await gameManagement.main();
            sinon.assert.calledOnce(getPossibleCodes);
        });

        it('calls organizeDirectories when organizeDirectories', async () => {
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

        it('calls syncLaunchboxToDb when launchboxToDb', async () => {
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

        it('calls buildDbFromFolders when buildDb', async () => {
            const buildDbFromFolders = sandbox.stub(
                scripts,
                'buildDbFromFolders'
            );
            const gameManagement = new GameManagement(settings, 'buildDb');
            await gameManagement.main();
            sinon.assert.calledOnce(buildDbFromFolders);
        });

        it('calls downloadImages when downloadImages', async () => {
            const downloadImages = sandbox.stub(scripts, 'downloadImages');
            const gameManagement = new GameManagement(
                settings,
                'downloadImages'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(downloadImages);
        });

        it('calls convertDbToLaunchbox when dbToLaunchbox', async () => {
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

        it('calls findPossibleDuplicates when findDuplicates', async () => {
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

        it('calls setForceUpdate when setForceUpdate', async () => {
            const setForceUpdate = sandbox.stub(scripts, 'setForceUpdate');
            const gameManagement = new GameManagement(
                settings,
                'setForceUpdate'
            );
            await gameManagement.main();
            sinon.assert.calledOnce(setForceUpdate);
        });

        it('calls all syncing phases when syncAll', async () => {
            const getPossibleCodes = sandbox.stub(scripts, 'getPossibleCodes');
            const organizeDirectories = sandbox.stub(
                scripts,
                'organizeDirectories'
            );
            const syncLaunchboxToDb = sandbox.stub(
                scripts,
                'syncLaunchboxToDb'
            );
            const buildDbFromFolders = sandbox.stub(
                scripts,
                'buildDbFromFolders'
            );
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
            sinon.assert.calledOnce(buildDbFromFolders);
            sinon.assert.calledOnce(convertDbToLaunchbox);

            sinon.assert.notCalled(setForceUpdate);
        });
    });

    describe('without operation given', () => {
        beforeEach(async () => {
            sandbox.stub(fs, 'existsSync').returns(true);
        });

        it('asks which scripts to use and runs it', async () => {
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
