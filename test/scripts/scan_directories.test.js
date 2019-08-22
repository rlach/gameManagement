const sinon = require('sinon');
const fs = require('fs');
const progress = require('../../src/util/progress');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const engineRecognizer = require('../../src/scripts/scan_directories/recognize_game_engine');
const executables = require('../../src/scripts/scan_directories/find_executable');

const scanDirectories = require('../../src/scripts/scan_directories/scan_directories');

describe('scanDirectories', function() {
    const mainPaths = ['main'];
    let progressBarUpdate;
    let database;
    const searchSettings = {
        exeSearchDepth: 1,
    };

    beforeEach(async function() {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });

        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            increment: progressBarUpdate,
            stop: sinon.spy(),
        });
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Marks all entries in database as deleted when there are no files', async function() {
        sinon.stub(fs, 'readdirSync').returns([]);
        const updateManySpy = sinon.spy(database.game, 'updateMany');
        await scanDirectories(database, mainPaths, searchSettings);

        sinon.assert.calledWithExactly(
            updateManySpy,
            { id: { $nin: [] } },
            { deleted: true }
        );
    });

    it('Marks games not found in directory listing as deleted', async function() {
        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const updateManySpy = sinon.spy(database.game, 'updateMany');
        await scanDirectories(database, mainPaths, searchSettings);

        sinon.assert.calledWithExactly(
            updateManySpy,
            { id: { $nin: ['dir'] } },
            { deleted: true }
        );
    });

    describe('Game is found', function() {
        beforeEach(async function() {
            sinon.stub(fs, 'readdirSync').returns(['dir']);
        });

        it('Creates new game with id equal to directory and marked as deleted', async function() {
            await scanDirectories(database, mainPaths, searchSettings);

            const game = await database.game.findOne({});
            expect(game).to.include({
                deleted: true,
                id: 'dir',
            });
        });

        it('If game is not deleted tries to find executable', async function() {
            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const findExecutableAndDirectory = sinon.stub(
                executables,
                'findExecutableAndDirectory'
            );

            await scanDirectories(database, mainPaths, searchSettings);

            const game = await database.game.findOne({});
            expect(game).to.include({
                id: 'dir',
            });
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledWithExactly(
                findExecutableAndDirectory,
                {
                    name: 'dir',
                    path: 'main',
                },
                searchSettings
            );
        });

        it('If game has executable tries to recognize game engine', async function() {
            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const findExecutableAndDirectory = sinon
                .stub(executables, 'findExecutableAndDirectory')
                .resolves({
                    executableFile: 'good.exe',
                });

            await scanDirectories(database, mainPaths, searchSettings);

            const game = await database.game.findOne({});
            expect(game).to.include({
                id: 'dir',
            });
            sinon.assert.calledOnce(recognizeGameEngine);
            sinon.assert.calledWithExactly(
                findExecutableAndDirectory,
                {
                    name: 'dir',
                    path: 'main',
                },
                searchSettings
            );
        });

        it('If game is marked as deleted but files are found marks as not deleted and handles normally', async function() {
            const originalGame = await database.game.retrieveFromDb('dir');
            originalGame.deleted = true;
            await database.game.save(originalGame);

            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const findExecutableAndDirectory = sinon.stub(
                executables,
                'findExecutableAndDirectory'
            );

            await scanDirectories(database, mainPaths, searchSettings);

            const game = await database.game.findOne({});
            expect(game).to.include({
                id: 'dir',
                deleted: false,
            });
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledWithExactly(
                findExecutableAndDirectory,
                {
                    name: 'dir',
                    path: 'main',
                },
                searchSettings
            );
        });
    });
});
