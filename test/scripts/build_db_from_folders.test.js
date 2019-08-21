const sinon = require('sinon');
const fs = require('fs');
const progress = require('../../src/util/progress');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const engineRecognizer = require('../../src/scripts/build_db_from_folders/recognize_game_engine');
const executables = require('../../src/scripts/build_db_from_folders/find_executable');

const buildDbFromFolders = require('../../src/scripts/build_db_from_folders/build_db_from_folders');

describe('buildDbFromFolders', function() {
    const mainPaths = ['main'];
    let progressBarUpdate;
    let database;
    let strategies;
    const searchSettings = {
        exeSearchDepth: 1,
    };

    beforeEach(async function() {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });

        strategies = [];
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
        await buildDbFromFolders(
            strategies,
            database,
            mainPaths,
            searchSettings
        );

        sinon.assert.calledWithExactly(
            updateManySpy,
            { id: { $nin: [] } },
            { deleted: true }
        );
    });

    it('Marks as deleted entries in database not found in directory scan', async function() {
        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const updateManySpy = sinon.spy(database.game, 'updateMany');
        await buildDbFromFolders(
            strategies,
            database,
            mainPaths,
            searchSettings
        );

        sinon.assert.calledWithExactly(
            updateManySpy,
            { id: { $nin: ['dir'] } },
            { deleted: true }
        );
    });

    describe('strategy available', function() {
        beforeEach(async function() {
            sinon.stub(fs, 'readdirSync').returns(['dir']);
        });

        it('Creates new game with id equal to directory and marked as deleted', async function() {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
            };

            await buildDbFromFolders(
                [strategy],
                database,
                mainPaths,
                searchSettings
            );

            const game = await database.game.findOne({});
            expect(game).to.include({
                deleted: true,
                id: 'dir',
                source: 'dummy',
            });
        });

        it('If game is not deleted tries to find executable, recognize game type and fetch sources', async function() {
            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const updateExecutableAndDirectory = sinon.stub(
                executables,
                'updateExecutableAndDirectory'
            );
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return {};
                },
                getAdditionalImages: async () => {
                    return undefined;
                },
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');

            await buildDbFromFolders(
                [strategy],
                database,
                mainPaths,
                searchSettings
            );

            const game = await database.game.findOne({});
            expect(game).to.include({
                forceSourceUpdate: false,
                id: 'dir',
                source: 'dummy',
            });
            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledWithExactly(
                updateExecutableAndDirectory,
                {
                    name: 'dir',
                    path: 'main',
                },
                sinon.match.any,
                searchSettings,
                database
            );
        });

        it('If game data was fetched fills the game with results', async function() {
            const gameDetails = {
                nameEn: 'nameEn',
                genresEn: 'genresEn',
                imageUrlEn: 'imageUrlEn',
                descriptionEn: 'descriptionEn',
                tagsEn: ['tagEn1', 'tagEn2'],
                makerEn: 'makerEn',
                nameJp: 'nameJp',
                genresJp: 'genresJp',
                imageUrlJp: 'imageUrlJp',
                additionalImages: ['1'],
                descriptionJp: 'descriptionJp',
                releaseDate: 'releaseDate',
                series: 'series',
                tagsJp: ['tagJp1', 'tagJp2'],
                makerJp: 'makerJp',
                video: 'video',
                communityStars: 4,
                communityStarVotes: 9128,
            };

            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const updateExecutableAndDirectory = sinon.stub(
                executables,
                'updateExecutableAndDirectory'
            );
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return gameDetails;
                },
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');

            await buildDbFromFolders(
                [strategy],
                database,
                mainPaths,
                searchSettings
            );

            const game = await database.game.findOne({});

            const expectedGame = {
                forceSourceUpdate: false,
                id: 'dir',
                source: 'dummy',
            };
            Object.assign(expectedGame, gameDetails);

            expect(game).to.deep.include(expectedGame);
            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledOnce(updateExecutableAndDirectory);
        });

        it('If game data was fetched without additional images fetches additional images separately', async function() {
            const gameDetails = {
                nameEn: 'nameEn',
            };

            sinon.stub(fs, 'existsSync').returns(true);
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            const updateExecutableAndDirectory = sinon.stub(
                executables,
                'updateExecutableAndDirectory'
            );
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return gameDetails;
                },
                getAdditionalImages: async () => {
                    return ['additionalIm1'];
                },
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');
            const getAdditionalImages = sinon.spy(
                strategy,
                'getAdditionalImages'
            );

            await buildDbFromFolders(
                [strategy],
                database,
                mainPaths,
                searchSettings
            );

            const game = await database.game.findOne({});

            const expectedGame = {
                forceSourceUpdate: false,
                id: 'dir',
                source: 'dummy',
                additionalImages: ['additionalIm1'],
            };
            Object.assign(expectedGame, gameDetails);

            expect(game).to.deep.include(expectedGame);
            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.calledOnce(getAdditionalImages);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledOnce(updateExecutableAndDirectory);
        });
    });
});
