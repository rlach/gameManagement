const sinon = require('sinon');
const fs = require('fs');
const progress = require('../../src/progress');

const results = require('../../src/scripts/organize_directories/confirm_scoring_results');

const organizeDirectories = require('../../src/scripts/organize_directories/organize_directories');

describe('organizeDirectories', function() {
    let progressBarUpdate;
    let settings;
    beforeEach(async () => {
        settings = {
            paths: {
                targetSortFolder: './target',
                unsortedGames: './mess',
            },
            organizeDirectories: {
                shouldAsk: true,
                minimumScoreToAccept: 1,
                minimumScoreToAsk: 0,
            },
        };
        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            update: progressBarUpdate,
            stop: sinon.spy(),
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Returns when no directories are found', async function() {
        sinon.stub(fs, 'readdirSync').returns([]);
        await organizeDirectories([], settings);
        sinon.assert.notCalled(progressBarUpdate);
    });

    it('Skips directories that do not have foundFiles.txt', async function() {
        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const readFileSync = sinon.stub(fs, 'readFileSync');
        sinon.stub(fs, 'existsSync').returns(false);
        await organizeDirectories([], settings);
        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.notCalled(readFileSync);
    });

    it('Skips directories where foundFiles.txt was marked with noMatch = true', async function() {
        const strategy = {
            name: 'strategyName',
            scoreCodes: sinon.stub(),
        };

        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const readFileSync = sinon.stub(fs, 'readFileSync').returns(
            JSON.stringify({
                noMatch: true,
            })
        );
        sinon.stub(fs, 'existsSync').returns(true);
        await organizeDirectories([strategy], settings);
        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.calledOnce(readFileSync);
        sinon.assert.notCalled(strategy.scoreCodes);
    });

    it('Skips directories where foundFiles.txt was not a valid json', async function() {
        const strategy = {
            name: 'strategyName',
            scoreCodes: sinon.stub(),
        };

        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const readFileSync = sinon
            .stub(fs, 'readFileSync')
            .returns('{noMatch: true}');
        sinon.stub(fs, 'existsSync').returns(true);
        await organizeDirectories([strategy], settings);
        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.calledOnce(readFileSync);
        sinon.assert.notCalled(strategy.scoreCodes);
    });

    it('Runs scoring strategy on directories where foundFiles.txt exists and is not marked as noMatch', async function() {
        const strategy = {
            name: 'strategyName',
            scoreCodes: sinon.stub().returns([]),
        };

        sinon.stub(fs, 'readdirSync').returns(['dir']);
        const readFileSync = sinon
            .stub(fs, 'readFileSync')
            .returns(JSON.stringify({}));
        sinon.stub(fs, 'existsSync').returns(true);
        const confirmResultsStub = sinon.stub(results, 'confirmResults');

        await organizeDirectories([strategy], settings);

        sinon.assert.calledOnce(progressBarUpdate);
        sinon.assert.calledOnce(readFileSync);
        sinon.assert.calledOnce(strategy.scoreCodes);
        sinon.assert.notCalled(confirmResultsStub);
    });

    describe('above minimum score to accept', () => {
        it('moves directory to new one based on result code', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        code: 'code',
                        score: 1,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .throws({
                    code: 'RESULT_REJECTED',
                });
            const renameSync = sinon.stub(fs, 'renameSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.notCalled(confirmResultsStub);
            sinon.assert.calledWith(
                renameSync,
                './mess/dir',
                './target/code/dir'
            );
        });

        it('moves directory to new one based on result code and creates new directory if needed', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        code: 'code',
                        score: 1,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon
                .stub(fs, 'existsSync')
                .onFirstCall()
                .returns(true)
                .onSecondCall()
                .returns(false);
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .throws({
                    code: 'RESULT_REJECTED',
                });
            const renameSync = sinon.stub(fs, 'renameSync');
            const mkdirSync = sinon.stub(fs, 'mkdirSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.notCalled(confirmResultsStub);
            sinon.assert.calledWith(mkdirSync, './target/code');
            sinon.assert.calledWith(
                renameSync,
                './mess/dir',
                './target/code/dir'
            );
        });

        it('takes best result from results array', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        code: 'almostWorst',
                        score: 2,
                    },
                    {
                        code: 'almostBest',
                        score: 3,
                    },
                    {
                        code: 'best',
                        score: 4,
                    },
                    {
                        code: 'worst',
                        score: 1,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .throws({
                    code: 'RESULT_REJECTED',
                });
            const renameSync = sinon.stub(fs, 'renameSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.notCalled(confirmResultsStub);
            sinon.assert.calledWith(
                renameSync,
                './mess/dir',
                './target/best/dir'
            );
        });
    });

    describe('below minimum score to accept and above minimum score to ask', () => {
        it('Does NOT Confirm results when shouldAsk is false', async function() {
            settings.organizeDirectories.shouldAsk = false;
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        score: 0,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const confirmResultsStub = sinon.stub(results, 'confirmResults');
            const renameSync = sinon.stub(fs, 'renameSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.notCalled(confirmResultsStub);
            sinon.assert.notCalled(renameSync);
        });

        it('Confirms results and marks them as noMatch if rejected', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        score: 0,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .throws({
                    code: 'RESULT_REJECTED',
                });
            const writeFileSync = sinon.stub(fs, 'writeFileSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.calledWith(confirmResultsStub, [{ score: 0 }]);
            sinon.assert.calledWith(
                writeFileSync,
                './mess/dir/!foundCodes.txt',
                JSON.stringify({ noMatch: true }, null, 4)
            );
        });

        it('Tries to confirm all results above ask threshold', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        code: 'a',
                        score: 0,
                    },
                    {
                        code: 'b',
                        score: 0,
                    },
                    {
                        code: 'c',
                        score: -1,
                    },
                    {
                        code: 'd',
                        score: -2,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .throws({
                    code: 'RESULT_REJECTED',
                });
            const writeFileSync = sinon.stub(fs, 'writeFileSync');

            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.calledWith(confirmResultsStub, [
                { code: 'a', score: 0 },
                { code: 'b', score: 0 },
            ]);
            sinon.assert.calledWith(
                writeFileSync,
                './mess/dir/!foundCodes.txt',
                JSON.stringify({ noMatch: true }, null, 4)
            );
        });

        it('Confirms results and accepts them if confirmed', async function() {
            const strategy = {
                name: 'strategyName',
                scoreCodes: sinon.stub().returns([
                    {
                        score: 0,
                    },
                ]),
            };

            sinon.stub(fs, 'readdirSync').returns(['dir']);
            const readFileSync = sinon
                .stub(fs, 'readFileSync')
                .returns(JSON.stringify({}));
            sinon.stub(fs, 'existsSync').returns(true);
            const renameSync = sinon.stub(fs, 'renameSync');
            const confirmResultsStub = sinon
                .stub(results, 'confirmResults')
                .resolves({
                    score: 1,
                    code: 'code',
                    accepted: true,
                });
            await organizeDirectories([strategy], settings);

            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.calledOnce(readFileSync);
            sinon.assert.calledOnce(strategy.scoreCodes);
            sinon.assert.calledOnce(confirmResultsStub);
            sinon.assert.calledWith(
                renameSync,
                './mess/dir',
                './target/code/dir'
            );
        });
    });
});
