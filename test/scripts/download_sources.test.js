const sinon = require('sinon');
const progress = require('../../src/util/progress');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const engineRecognizer = require('../../src/scripts/scan_directories/recognize_game_engine');

const selfTest = require('../../src/scripts/self_test');
const downloadSources = require('../../src/scripts/download_sources');

describe('downloadSources', function() {
    const mainPaths = ['main'];
    let progressBarUpdate;
    let database;
    const searchSettings = {
        exeSearchDepth: 1,
    };
    let selfTestStub;

    beforeEach(async function() {
        selfTestStub = sinon.stub(selfTest, 'selfTest');
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

    it('Does not download any sources when database is empty', async function() {
        await downloadSources([], database);
        sinon.assert.notCalled(progressBarUpdate);
        sinon.assert.notCalled(selfTestStub);
    });

    it('Does not download any sources when database contains only deleted games', async function() {
        const game = await database.game.retrieveFromDb('123');
        game.deleted = true;
        await database.game.save(game);
        await downloadSources([], database);
        sinon.assert.notCalled(progressBarUpdate);
        sinon.assert.notCalled(selfTestStub);
    });

    it('Does not download any sources when database contains not-deleted game but all sources are missing', async function() {
        const game = await database.game.retrieveFromDb('123');
        game.sourceMissingJp = true;
        game.sourceMissingEn = true;
        await database.game.save(game);
        await downloadSources([], database);
        sinon.assert.notCalled(progressBarUpdate);
        sinon.assert.notCalled(selfTestStub);
    });

    it('Tries to download sources when game is not deleted and only one source is missing', async function() {
        const game = await database.game.retrieveFromDb('123');
        game.sourceMissingJp = true;
        await database.game.save(game);
        await downloadSources([], database);
        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.calledOnce(selfTestStub);
    });

    it('Does not download sources when matching strategy is not found', async function() {
        const game = await database.game.retrieveFromDb('123');
        await downloadSources([], database);
        sinon.assert.calledOnce(progressBarUpdate);
        const gameAfterUpdate = await database.game.findOne({});
        expect(game).to.eql(gameAfterUpdate);
        sinon.assert.calledOnce(selfTestStub);
    });

    describe('strategy available', function() {
        let game;
        beforeEach(async function() {
            game = await database.game.retrieveFromDb('123');
        });

        it('Does not download sources when at least one is already downloaded', async function() {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {},
            };
            const fetchGameDataSpy = sinon.spy(strategy, 'fetchGameData');

            game.nameJp = 'I am downloaded';
            game.sourceMissingEn = true;
            await database.game.save(game);
            await downloadSources([strategy], database);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(fetchGameDataSpy);
            sinon.assert.calledOnce(selfTestStub);
        });

        it('It downloads additional images if game has forceAdditionalImagesUpdate flag even if sources are already downloaded', async function() {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {},
                getAdditionalImages: async () => {},
            };
            const fetchGameDataSpy = sinon.spy(strategy, 'fetchGameData');
            const getAdditionalImagesSpy = sinon.spy(
                strategy,
                'getAdditionalImages'
            );

            game.nameJp = 'I am downloaded';
            game.sourceMissingEn = true;
            game.forceAdditionalImagesUpdate = true;
            await database.game.save(game);
            await downloadSources([strategy], database);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(fetchGameDataSpy);
            sinon.assert.calledOnce(getAdditionalImagesSpy);
            sinon.assert.calledOnce(selfTestStub);
        });

        it('After forceAdditionalImagesUpdate the new images are added to download and additionalImages in the game are updated', async function() {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {},
                getAdditionalImages: async () => [
                    'I-am-not-alone.jpg',
                    'We-are-siblings.png',
                ],
            };
            const fetchGameDataSpy = sinon.spy(strategy, 'fetchGameData');
            const getAdditionalImagesSpy = sinon.spy(
                strategy,
                'getAdditionalImages'
            );

            game.nameJp = 'I am downloaded';
            game.additionalImages = ['Only-one.jpg'];
            game.sourceMissingEn = true;
            game.forceAdditionalImagesUpdate = true;
            await database.game.save(game);
            await downloadSources([strategy], database);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(fetchGameDataSpy);
            sinon.assert.calledOnce(getAdditionalImagesSpy);

            const updatedGame = await database.game.findOne({});
            expect(updatedGame.additionalImages).to.eql([
                'I-am-not-alone.jpg',
                'We-are-siblings.png',
            ]);

            const imagesToDownload = await database.image.find({});

            expect(imagesToDownload).to.have.length(3);

            const backgroundImage = imagesToDownload.find(
                i => i.type === 'background'
            );
            expect(backgroundImage).to.contain({
                gameId: '123',
                status: 'toDownload',
                type: 'background',
                uri: 'We-are-siblings.png',
            });

            const fistScreenshot = imagesToDownload.find(
                i => i.uri === 'I-am-not-alone.jpg'
            );
            expect(fistScreenshot).to.contain({
                gameId: '123',
                status: 'toDownload',
                type: 'screenshot',
                uri: 'I-am-not-alone.jpg',
            });

            const secondScreenshot = imagesToDownload.find(
                i => i.uri === 'We-are-siblings.png' && i.type === 'screenshot'
            );
            expect(secondScreenshot).to.contain({
                gameId: '123',
                status: 'toDownload',
                type: 'screenshot',
                uri: 'We-are-siblings.png',
            });
            sinon.assert.calledOnce(selfTestStub);
        });

        it('It downloads sources if game has forceSourcesUpdate flag even if sources are already downloaded', async function() {
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return {};
                },
                getAdditionalImages: async () => {
                    return [];
                },
            };
            const fetchGameDataSpy = sinon.spy(strategy, 'fetchGameData');
            const getAdditionalImagesSpy = sinon.spy(
                strategy,
                'getAdditionalImages'
            );

            game.nameJp = 'I am downloaded';
            game.sourceMissingEn = true;
            game.forceSourceUpdate = true;
            await database.game.save(game);
            await downloadSources([strategy], database);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(fetchGameDataSpy);
            sinon.assert.calledOnce(getAdditionalImagesSpy);
            sinon.assert.calledOnce(selfTestStub);
        });

        it('If game is not deleted fetches sources', async function() {
            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
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

            await downloadSources([strategy], database);

            const game = await database.game.findOne({});
            const images = await database.image.find({});
            expect(game).to.include({
                forceAdditionalImagesUpdate: false,
                forceSourceUpdate: false,
                id: '123',
                source: 'dummy',
            });
            expect(images).to.eql([]);
            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledOnce(selfTestStub);
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

            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return gameDetails;
                },
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');

            await downloadSources([strategy], database);

            const game = await database.game.findOne({});

            const expectedGame = {
                forceSourceUpdate: false,
                id: '123',
                source: 'dummy',
            };
            Object.assign(expectedGame, gameDetails);

            expect(game).to.deep.include(expectedGame);

            const images = await database.image.find({});
            expect(images.length).to.eql(3);

            const boxImage = images.find(i => i.type === 'box');
            expect(boxImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.imageUrlJp}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'box',
            });

            const screenshotImage = images.find(i => i.type === 'screenshot');
            expect(screenshotImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'screenshot',
            });

            const backgroundImage = images.find(i => i.type === 'background');
            expect(backgroundImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'background',
            });

            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledOnce(selfTestStub);
        });

        it('If matching image exists in database updates it to toDownload', async function() {
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

            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
            );
            let strategy = {
                name: 'dummy',
                shouldUse: () => true,
                fetchGameData: async () => {
                    return gameDetails;
                },
            };
            const fetchGameData = sinon.spy(strategy, 'fetchGameData');

            await downloadSources([strategy], database);

            await database.game.updateMany(
                {},
                { $set: { forceSourceUpdate: true } }
            );
            await database.image.updateMany(
                {},
                { $set: { status: 'downloaded' } }
            );
            const updatedImages = await database.image.find({});
            expect(updatedImages[0].status).to.eql('downloaded');

            await downloadSources([strategy], database);

            const game = await database.game.findOne({});

            const expectedGame = {
                forceSourceUpdate: false,
                id: '123',
                source: 'dummy',
            };
            Object.assign(expectedGame, gameDetails);

            expect(game).to.deep.include(expectedGame);

            const images = await database.image.find({});
            expect(images.length).to.eql(3);

            const boxImage = images.find(i => i.type === 'box');
            expect(boxImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.imageUrlJp}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'box',
            });

            const screenshotImage = images.find(i => i.type === 'screenshot');
            expect(screenshotImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'screenshot',
            });

            const backgroundImage = images.find(i => i.type === 'background');
            expect(backgroundImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'background',
            });

            sinon.assert.calledTwice(fetchGameData);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledTwice(selfTestStub);
        });

        it('If game data was fetched without additional images fetches additional images separately', async function() {
            const gameDetails = {
                nameEn: 'nameEn',
            };

            const recognizeGameEngine = sinon.stub(
                engineRecognizer,
                'recognizeGameEngine'
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

            await downloadSources(
                [strategy],
                database,
                mainPaths,
                searchSettings
            );

            const game = await database.game.findOne({});

            const expectedGame = {
                forceSourceUpdate: false,
                id: '123',
                source: 'dummy',
                additionalImages: ['additionalIm1'],
            };
            Object.assign(expectedGame, gameDetails);

            expect(game).to.deep.include(expectedGame);

            const images = await database.image.find({});
            expect(images.length).to.eql(2);

            const screenshotImage = images.find(i => i.type === 'screenshot');
            expect(screenshotImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'screenshot',
            });

            const backgroundImage = images.find(i => i.type === 'background');
            expect(backgroundImage).to.include({
                gameId: '123',
                filename: `${game.launchboxId}.${game.additionalImages[0]}`,
                launchboxId: game.launchboxId,
                status: 'toDownload',
                type: 'background',
            });

            sinon.assert.calledOnce(fetchGameData);
            sinon.assert.calledOnce(getAdditionalImages);
            sinon.assert.notCalled(recognizeGameEngine);
            sinon.assert.calledOnce(selfTestStub);
        });
    });
});
