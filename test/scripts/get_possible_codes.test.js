const sinon = require('sinon');
const fs = require('fs');
const progress = require('../../src/util/progress');

const getPossibleCodes = require('../../src/scripts/get_possible_codes');

describe('getPossibleCodes', function() {
    const gamePath = 'path';
    beforeEach(async () => {
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            update: sinon.spy(),
            stop: sinon.spy(),
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Returns when no directories are found', async function() {
        const readdir = sinon.stub(fs, 'readdirSync').returns([]);
        const existsSync = sinon.spy(fs, 'existsSync');
        await getPossibleCodes([], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.notCalled(existsSync);
    });

    it('Skips the directory which has foundCodes already created', async function() {
        const readdir = sinon.stub(fs, 'readdirSync').returns(['dir']);
        const existsSync = sinon.stub(fs, 'existsSync').returns(true);
        const writeFileSync = sinon.spy(fs, 'writeFileSync');
        await getPossibleCodes([], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.calledWithExactly(existsSync, 'path/dir/!foundCodes.txt');
        sinon.assert.notCalled(writeFileSync);
    });

    it('Parses file which has no foundCodes', async function() {
        const readdir = sinon.stub(fs, 'readdirSync').returns(['dir']);
        const existsSync = sinon.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sinon.stub(fs, 'writeFileSync');
        await getPossibleCodes([], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.calledWithExactly(existsSync, 'path/dir/!foundCodes.txt');
        sinon.assert.calledWithExactly(
            writeFileSync,
            'path/dir/!foundCodes.txt',
            JSON.stringify(
                {
                    file: 'dir',
                },
                null,
                4
            )
        );
    });

    it('Swallows file write errors', async function() {
        const readdir = sinon.stub(fs, 'readdirSync').returns(['dir']);
        const existsSync = sinon.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sinon.stub(fs, 'writeFileSync').throws('whoops');
        await getPossibleCodes([], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.calledWithExactly(existsSync, 'path/dir/!foundCodes.txt');
        sinon.assert.calledWithExactly(
            writeFileSync,
            'path/dir/!foundCodes.txt',
            JSON.stringify(
                {
                    file: 'dir',
                },
                null,
                4
            )
        );
    });

    it('Runs supplied strategy', async function() {
        const strategy = {
            name: 'strategyName',
            findGame: sinon.stub().returns([]),
            extractCode: sinon.stub().returns(''),
        };

        const readdir = sinon.stub(fs, 'readdirSync').returns(['dir']);
        const existsSync = sinon.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sinon.stub(fs, 'writeFileSync');
        await getPossibleCodes([strategy], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.calledWithExactly(existsSync, 'path/dir/!foundCodes.txt');

        sinon.assert.calledWithExactly(strategy.findGame, 'dir');
        sinon.assert.calledWithExactly(strategy.extractCode, 'dir');

        sinon.assert.calledWithExactly(
            writeFileSync,
            'path/dir/!foundCodes.txt',
            JSON.stringify(
                {
                    file: 'dir',
                    strategyName: {
                        extractedCode: '',
                        foundCodes: [],
                    },
                },
                null,
                4
            )
        );
    });

    it('Returns codes gotten from strategies', async function() {
        const strategy = {
            name: 'strategyName',
            findGame: sinon.stub().returns([
                {
                    workno: '12345',
                    work_name: 'abc',
                },
            ]),
            extractCode: sinon.stub().returns('dir'),
        };

        const strategy2 = {
            name: 'strategyName2',
            findGame: sinon.stub().returns([
                {
                    workno: '12345',
                    work_name: 'abc',
                },
            ]),
            extractCode: sinon.stub().returns('dir'),
        };

        const readdir = sinon.stub(fs, 'readdirSync').returns(['dir']);
        const existsSync = sinon.stub(fs, 'existsSync').returns(false);
        const writeFileSync = sinon.stub(fs, 'writeFileSync');
        await getPossibleCodes([strategy, strategy2], gamePath);
        sinon.assert.calledWithExactly(readdir, gamePath);
        sinon.assert.calledWithExactly(existsSync, 'path/dir/!foundCodes.txt');

        sinon.assert.calledWithExactly(strategy.findGame, 'dir');
        sinon.assert.calledWithExactly(strategy.extractCode, 'dir');

        sinon.assert.calledWithExactly(
            writeFileSync,
            'path/dir/!foundCodes.txt',
            JSON.stringify(
                {
                    file: 'dir',
                    strategyName: {
                        extractedCode: 'dir',
                        foundCodes: [
                            {
                                workno: '12345',
                                work_name: 'abc',
                            },
                        ],
                    },
                    strategyName2: {
                        extractedCode: 'dir',
                        foundCodes: [
                            {
                                workno: '12345',
                                work_name: 'abc',
                            },
                        ],
                    },
                },
                null,
                4
            )
        );
    });
});
