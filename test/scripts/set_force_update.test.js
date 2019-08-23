const sinon = require('sinon');
const inquirer = require('inquirer');
const { initDatabase } = require('../../src/database/database');

const setForceUpdate = require('../../src/scripts/set_force_update');

describe('scanDirectories', function() {
    let updateManySpy;
    let inquirerStub;
    let database;

    beforeEach(async function() {
        inquirerStub = sinon.stub(inquirer, 'prompt');

        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });
        updateManySpy = sinon.spy(database.game, 'updateMany');
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Returns when user did not select anything to update', async function() {
        inquirerStub.resolves({
            fields: [],
        });

        await setForceUpdate(database);

        sinon.assert.calledOnce(inquirerStub);
    });

    describe('fields selected', function() {
        beforeEach(async function() {
            inquirerStub.onFirstCall().resolves({
                fields: ['source'],
            });
        });

        it('Updates selected field on all games when there are no filters', async function() {
            inquirerStub.onSecondCall().resolves({
                filters: [],
            });

            await setForceUpdate(database);

            sinon.assert.calledTwice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                {},
                {
                    $set: {
                        forceSourceUpdate: true,
                    },
                }
            );
        });

        it('Updates selected field on all games from selected sources if source filters are selected', async function() {
            inquirerStub.onSecondCall().resolves({
                filters: ['dlsite', 'dmm'],
            });

            await setForceUpdate(database);

            sinon.assert.calledTwice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                {
                    source: { $in: ['dlsite', 'dmm'] },
                },
                {
                    $set: {
                        forceSourceUpdate: true,
                    },
                }
            );
        });

        it('Updates selected field on all games starting with selected startsWith filter', async function() {
            inquirerStub.onSecondCall().resolves({
                filters: ['VJ'],
            });

            await setForceUpdate(database);

            sinon.assert.calledTwice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                { id: { $regex: /^(VJ)/ } },
                {
                    $set: {
                        forceSourceUpdate: true,
                    },
                }
            );
        });

        it('Updates selected field on all games matching startsWith filter or sources filter', async function() {
            inquirerStub.onSecondCall().resolves({
                filters: ['getchu', 'VJ'],
            });

            await setForceUpdate(database);

            sinon.assert.calledTwice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                {
                    $or: [
                        { source: { $in: ['getchu'] } },
                        { id: { $regex: /^(VJ)/ } },
                    ],
                },
                {
                    $set: {
                        forceSourceUpdate: true,
                    },
                }
            );
        });
    });

    describe('games filter selected', function() {
        beforeEach(async function() {
            inquirerStub.onFirstCall().resolves({
                fields: ['source'],
            });
        });

        it('Returns without updating if games filter was selected but no games were chosen', async function() {
            inquirerStub
                .onSecondCall()
                .resolves({
                    filters: ['game'],
                })
                .onThirdCall()
                .resolves({
                    games: [],
                });

            await setForceUpdate(database);

            sinon.assert.calledThrice(inquirerStub);
            sinon.assert.notCalled(updateManySpy);
        });

        it('Updates games that were chosen', async function() {
            inquirerStub
                .onSecondCall()
                .resolves({
                    filters: ['game'],
                })
                .onThirdCall()
                .resolves({
                    games: ['RJ1234', 'VJ1235', 'd_1234'],
                });

            await setForceUpdate(database);

            sinon.assert.calledThrice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                { id: { $in: ['RJ1234', 'VJ1235', 'd_1234'] } },
                { $set: { forceSourceUpdate: true } }
            );
        });

        it('Updates games that were chosen along with other filters that were selected previously', async function() {
            inquirerStub
                .onSecondCall()
                .resolves({
                    filters: ['game', 'dmm', 'VJ'],
                })
                .onThirdCall()
                .resolves({
                    games: ['RJ1234', 'VJ1235', 'd_1234'],
                });

            await setForceUpdate(database);

            sinon.assert.calledThrice(inquirerStub);
            sinon.assert.calledWithExactly(
                updateManySpy,
                {
                    $or: [
                        { source: { $in: ['dmm'] } },
                        { id: { $regex: /^(VJ)/ } },
                        { id: { $in: ['RJ1234', 'VJ1235', 'd_1234'] } },
                    ],
                },
                { $set: { forceSourceUpdate: true } }
            );
        });

        describe('fields', function() {
            it('sets fields that were selected to true in update query', async function() {
                inquirerStub
                    .onFirstCall()
                    .resolves({
                        fields: ['source', 'executable', 'additionalImages'],
                    })
                    .onSecondCall()
                    .resolves({
                        filters: [],
                    });

                await setForceUpdate(database);

                sinon.assert.calledTwice(inquirerStub);
                sinon.assert.calledWithExactly(
                    updateManySpy,
                    {},
                    {
                        $set: {
                            forceAdditionalImagesUpdate: true,
                            forceExecutableUpdate: true,
                            forceSourceUpdate: true,
                        },
                    }
                );
            });

            it('fields that were not selected do not appear in update query', async function() {
                inquirerStub
                    .onFirstCall()
                    .resolves({
                        fields: ['additionalImages'],
                    })
                    .onSecondCall()
                    .resolves({
                        filters: [],
                    });

                await setForceUpdate(database);

                sinon.assert.calledTwice(inquirerStub);
                sinon.assert.calledWithExactly(
                    updateManySpy,
                    {},
                    {
                        $set: {
                            forceAdditionalImagesUpdate: true,
                        },
                    }
                );
            });
        });
    });
});
