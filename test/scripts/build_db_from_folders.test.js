const sinon = require('sinon');
const fs = require('fs');
const progress = require('../../src/progress');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const typeRecognizer = require('../../src/scripts/build_db_from_folders/recognize_game_type');
const executables = require('../../src/scripts/build_db_from_folders/find_executable');

const buildDbFromFolders = require('../../src/scripts/build_db_from_folders/build_db_from_folders');

describe('organizeDirectories', function() {
    const mainPaths = ['main'];
    let progressBarUpdate;
    let settings;
    let database;
    let strategies;
    before(async () => {
        database = await initDatabase({
            database: 'nedb',
            nedbFilename: ''
        });
    });

    beforeEach(async () => {
        strategies = [];
        settings = {
            paths: {
                targetSortFolder: './target',
                unsortedGames: './mess'
            },
            organizeDirectories: {
                shouldAsk: true,
                minimumScoreToAccept: 1,
                minimumScoreToAsk: 0
            }
        };
        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            update: progressBarUpdate,
            stop: sinon.spy()
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Marks all entries in database as deleted when there are no files', async () => {
        sinon.stub(fs, 'readdirSync').returns([]);
        const updateManySpy = sinon.spy(database.game, 'updateMany');
        await buildDbFromFolders(strategies, database, [mainPaths]);

        sinon.assert.calledWith(updateManySpy, { id: { $nin: [] } });
    });

    it('Marks as deleted entries in database not found in directory scan', async () => {
        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const updateManySpy = sinon.spy(database.game, 'updateMany');
        await buildDbFromFolders(strategies, database, [mainPaths]);

        sinon.assert.calledWith(updateManySpy, { id: { $nin: ['dir'] } });
    });

    describe('strategy available', () => {
        beforeEach(async () => {
            sinon.stub(fs, 'readdirSync').returns(['dir']);
        });

        it('Creates new game with id equal to directory and marked as deleted', async () => {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true
            };

            await buildDbFromFolders([strategy], database, [mainPaths]);

            const game = await database.game.findOne({});
            expect(game).to.include({
                deleted: true,
                id: 'dir',
                source: 'dummy'
            });
        });

        it('If game is not deleted tries to find engine, recognize game type and fetch sources', async () => {
            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameType = sinon.stub(typeRecognizer, 'recognizeGameType');
            const updateExecutableAndDirectory = sinon.stub(executables, 'updateExecutableAndDirectory');
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return {};
                }
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');

            await buildDbFromFolders([strategy], database, [mainPaths]);

            const game = await database.game.findOne({});
            expect(game).to.include({
                deleted: false,
                engine: undefined,
                forceSourceUpdate: false,
                id: 'dir',
                source: 'dummy'
            });
            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.calledOnce(recognizeGameType);
            sinon.assert.calledOnce(updateExecutableAndDirectory);
        });
    });
});
