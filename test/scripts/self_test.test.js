const sinon = require('sinon');
const inquirer = require('inquirer');
const progress = require('./../../src/util/progress');

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
        sinon.assert.calledWithExactly(promptStub, {
            default: false,
            message: 'Do you want to perform sync anyway?',
            name: 'continue',
            type: 'confirm',
        });
        sinon.assert.calledOnce(exitStub);
    });

    it('asks for confirmation if some test failed and continues if user wishes to', async function() {
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
        sinon.assert.calledWithExactly(promptStub, {
            default: false,
            message: 'Do you want to perform sync anyway?',
            name: 'continue',
            type: 'confirm',
        });
        sinon.assert.notCalled(exitStub);
    });
});
