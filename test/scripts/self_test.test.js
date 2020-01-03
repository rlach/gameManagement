const sinon = require('sinon');
const inquirer = require('inquirer');
const progress = require('./../../src/util/progress');
const fs = require('fs');

const selfTest = require('../../src/scripts/self_test').selfTest;

describe('selfTest', function() {
    let strategy;
    let selfTestStub;

    beforeEach(async function() {
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            increment: sinon.spy(),
            stop: sinon.spy(),
        });

        strategy = {
            selfTest: () => [],
        };
        selfTestStub = sinon.stub(strategy, 'selfTest');
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('continues when there are no strategies', async function() {
        await selfTest([]);
    });

    it('calls selfTest on supplied strategies and continues if only empty arrays were returned', async function() {
        selfTestStub.returns([]);

        await selfTest([strategy]);
        sinon.assert.calledWithExactly(selfTestStub);
    });

    it('continues if strategies returned only successes', async function() {
        selfTestStub.returns([
            {
                passes: true,
            },
        ]);

        await selfTest([strategy]);
        sinon.assert.calledWithExactly(selfTestStub);
    });

    it('asks for confirmation if some test failed and exists if user wishes not to continue', async function() {
        selfTestStub.returns([
            {
                passes: false,
            },
        ]);

        const promptStub = sinon
            .stub(inquirer, 'prompt')
            .resolves({ continue: false });

        const exitStub = sinon.stub(process, 'exit');

        await selfTest([strategy]);
        sinon.assert.calledWithExactly(selfTestStub);
        sinon.assert.calledWithExactly(promptStub, [
            {
                default: false,
                message: 'Do you want to perform sync anyway?',
                name: 'continue',
                type: 'confirm',
            },
            {
                default: false,
                message: 'Do you want to save new version as expected?',
                name: 'save',
                type: 'confirm',
                when: sinon.match.any,
            },
        ]);
        sinon.assert.calledOnce(exitStub);
    });

    it('asks for confirmation if some test failed and continues if user wishes to, asking if should save new settings', async function() {
        selfTestStub.returns([
            {
                passes: false,
            },
        ]);

        const promptStub = sinon
            .stub(inquirer, 'prompt')
            .resolves({ continue: true });

        const exitStub = sinon.stub(process, 'exit');

        await selfTest([strategy]);
        sinon.assert.calledWithExactly(selfTestStub);
        sinon.assert.calledWithExactly(promptStub, [
            {
                default: false,
                message: 'Do you want to perform sync anyway?',
                name: 'continue',
                type: 'confirm',
            },
            {
                default: false,
                message: 'Do you want to save new version as expected?',
                name: 'save',
                type: 'confirm',
                when: sinon.match.any,
            },
        ]);
        sinon.assert.notCalled(exitStub);
    });

    it('updates settings file for self test if user wishes to', async function() {
        const readStub = sinon.stub(fs, 'readFileSync').returns('{}');
        const writeStub = sinon.stub(fs, 'writeFileSync');

        selfTestStub.returns([
            {
                passes: false,
                fieldName: 'fieldName',
                actual: { foo: 'bar' },
                strategy: 'foo',
            },
        ]);

        const promptStub = sinon
            .stub(inquirer, 'prompt')
            .resolves({ continue: true, save: true });

        const exitStub = sinon.stub(process, 'exit');

        await selfTest([strategy]);
        sinon.assert.calledWithExactly(selfTestStub);
        sinon.assert.calledWithExactly(promptStub, [
            {
                default: false,
                message: 'Do you want to perform sync anyway?',
                name: 'continue',
                type: 'confirm',
            },
            {
                default: false,
                message: 'Do you want to save new version as expected?',
                name: 'save',
                type: 'confirm',
                when: sinon.match.any,
            },
        ]);

        sinon.assert.calledOnce(readStub);
        sinon.assert.calledWith(
            writeStub,
            'config/default.json',
            JSON.stringify(
                {
                    foo: {
                        fieldName: {
                            foo: 'bar',
                        },
                    },
                },
                null,
                4
            )
        );

        sinon.assert.notCalled(exitStub);
    });
});
