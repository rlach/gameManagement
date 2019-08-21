const sinon = require('sinon');
const inquirer = require('inquirer');
const progress = require('../../src/util/progress');
const { expect } = require('chai');

const {
    confirmResults,
} = require('../../src/scripts/organize_directories/confirm_scoring_results');

describe('buildDbFromFolders', function() {
    const dummyResult = {
        name: 'Something',
        code: 'XV12345',
        score: 5,
        strategy: 'dummy',
    };

    const dummyResultWithoutName = {
        code: 'XV67890',
        score: 10,
        strategy: 'dummy',
    };

    let progressBarUpdate;

    beforeEach(async function() {
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

    it('Throws when results are undefined', function() {
        return expect(
            confirmResults(undefined, 'anything', 5)
        ).to.eventually.be.rejectedWith('No results to confirm');
    });

    it('Throws when the results array is empty', async function() {
        return expect(
            confirmResults([], 'anything', 5)
        ).to.eventually.be.rejectedWith('No results to confirm');
    });

    describe('single result', function() {
        it('Throws when the result was rejected by user', async function() {
            sinon.stub(inquirer, 'prompt').resolves({
                same: false,
            });
            return expect(
                confirmResults([dummyResult], 'anything', 5)
            ).to.eventually.be.rejectedWith('Best result not accepted');
        });

        it('Accepts result with the name when user accepted', async function() {
            const promptStub = sinon.stub(inquirer, 'prompt').resolves({
                same: true,
            });
            const result = await confirmResults([dummyResult], 'anything', 5);
            sinon.assert.calledWithExactly(promptStub, [
                {
                    message: `Are \n* Something \n* anything \nthe same? \nCode XV12345(score 5, strategy dummy)\n>`,
                    name: 'same',
                    type: 'confirm',
                },
            ]);
            expect(result).to.eql({
                ...dummyResult,
                accepted: true,
            });
        });

        it('Accepts result with only the code when user accepted', async function() {
            const promptStub = sinon.stub(inquirer, 'prompt').resolves({
                same: true,
            });

            const result = await confirmResults(
                [dummyResultWithoutName],
                'anything',
                5
            );
            sinon.assert.calledWithExactly(promptStub, [
                {
                    message: `Is XV67890 proper for anything? (Code extracted from filename) (score 10, strategy dummy)`,
                    name: 'same',
                    type: 'confirm',
                },
            ]);
            expect(result).to.eql({
                ...dummyResultWithoutName,
                accepted: true,
            });
        });
    });

    describe('multiple results', function() {
        it('Throws when all results were rejected by user', async function() {
            sinon.stub(inquirer, 'prompt').resolves({
                same: 0,
            });
            return expect(
                confirmResults(
                    [dummyResult, dummyResultWithoutName],
                    'anything',
                    5
                )
            ).to.eventually.be.rejectedWith('Best result not accepted');
        });

        it('Accepts code with order in the array equal to selected number(starting from 1, not 0)', async function() {
            const promptStub = sinon.stub(inquirer, 'prompt').resolves({
                same: 1,
            });
            const result = await confirmResults(
                [dummyResult, dummyResultWithoutName],
                'anything',
                5
            );
            sinon.assert.calledWithExactly(promptStub, [
                {
                    choices: [
                        { name: 'None', value: 0 },
                        { name: 'Something (Score 5, dummy)', value: 1 },
                        {
                            name:
                                'XV67890(code extracted from filename) (Score 10, dummy)',
                            value: 2,
                        },
                    ],
                    message: 'Which result matches \n* anything?',
                    default: 0,
                    name: 'same',
                    type: 'list',
                },
            ]);
            expect(result).to.eql({
                ...dummyResult,
                accepted: true,
            });
        });
    });
});
