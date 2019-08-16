const sinon = require('sinon');
const moment = require('moment');
const progress = require('../../src/util/progress');
const fs = require('fs');
const { initDatabase } = require('../../src/database/database');
const Chai = require('chai');
const ChaiPromised = require('chai-as-promised');
const { expect } = Chai;
const mapper = require('../../src/util/mapper');

Chai.use(ChaiPromised);

const syncLaunchboxToDb = require('../../src/scripts/sync_launchbox_to_db');

describe('syncLaunchboxToDb', function() {
    const launchboxId = 'uuid';
    const olderDate = moment('1986-01-01', 'YYYY-MM-DD').format();
    const newerDate = moment('2019-01-01', 'YYYY-MM-DD').format();
    const launchboxPath = 'launchboxPath';
    const launchboxPlatform = 'PLATFORM';
    let gameSaveSpy;
    let progressBarUpdate;
    let progressBarStart;
    let database;

    beforeEach(async () => {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });
        gameSaveSpy = sinon.spy(database.game, 'save');

        progressBarStart = sinon.spy();
        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: progressBarStart,
            update: progressBarUpdate,
            stop: sinon.spy(),
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Completes if launchbox file does not exist', async () => {
        await syncLaunchboxToDb(
            launchboxPath,
            launchboxPlatform,
            false,
            database
        );
        sinon.assert.notCalled(progressBarStart);
    });

    it('Throws when xml file has no LaunchBox tag', async () => {
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns('');
        return expect(
            syncLaunchboxToDb(launchboxPath, launchboxPlatform, false, database)
        ).to.be.eventually.rejectedWith('Not a launchbox file');
    });

    it('Completes when file has no games', async () => {
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns('<LaunchBox />');
        await syncLaunchboxToDb(
            launchboxPath,
            launchboxPlatform,
            false,
            database
        );
        sinon.assert.calledOnce(progressBarStart);
        sinon.assert.notCalled(progressBarUpdate);
    });

    describe('skips game', () => {
        beforeEach(async () => {
            sinon.stub(fs, 'existsSync').returns(true);
        });

        it('when game not in database', async () => {
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID></Game></LaunchBox>`
                );
            await database.game.retrieveFromDb('differentUuid');
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            sinon.assert.calledOnce(progressBarStart);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(gameSaveSpy);
        });

        it('when game in database but is newer than xml file', async () => {
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${olderDate}</DateModified></Game></LaunchBox>`
                );
            await database.game.retrieveFromDb('uuid');
            await database.game.updateMany(
                {},
                {
                    dateModified: newerDate,
                }
            );
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            sinon.assert.calledOnce(progressBarStart);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(gameSaveSpy);
        });

        it('when game in database but is newer than xml file and last played is newer than xml file', async () => {
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${olderDate}</DateModified><LastPlayedDate>${olderDate}</LastPlayedDate></Game></LaunchBox>`
                );
            await database.game.retrieveFromDb('uuid');
            await database.game.updateMany(
                {},
                {
                    dateModified: newerDate,
                    lastPlayedDate: newerDate,
                }
            );
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            sinon.assert.calledOnce(progressBarStart);
            sinon.assert.calledOnce(progressBarUpdate);
            sinon.assert.notCalled(gameSaveSpy);
        });
    });

    describe('syncs game', () => {
        beforeEach(async () => {
            await database.game.retrieveFromDb(1);
            sinon.stub(fs, 'existsSync').returns(true);
            sinon.stub(mapper, 'reverseMap').returns({
                launchboxId,
                dateModified: newerDate,
                lastPlayedDate: newerDate,
            });
        });

        it('when xml game is newer than database', async () => {
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${newerDate}</DateModified><LastPlayedDate>${olderDate}</LastPlayedDate></Game></LaunchBox>`
                );
            await database.game.updateMany(
                {},
                {
                    $set: {
                        dateAdded: olderDate,
                        dateModified: olderDate,
                        lastPlayedDate: newerDate,
                        launchboxId,
                    },
                }
            );
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            const gameAfter = await database.game.findOne({
                id: 1,
            });
            expect(gameAfter).to.include({
                dateAdded: olderDate,
                dateModified: newerDate,
                id: 1,
                lastPlayedDate: newerDate,
                launchboxId: 'uuid',
            });
        });

        it('treats undefined values in database as older', async () => {
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${olderDate}</DateModified><LastPlayedDate>${olderDate}</LastPlayedDate></Game></LaunchBox>`
                );
            await database.game.updateMany(
                {},
                {
                    $set: {
                        dateAdded: olderDate,
                        dateModified: undefined,
                        lastPlayedDate: newerDate,
                        launchboxId,
                    },
                }
            );
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            const gameAfter = await database.game.findOne({
                id: 1,
            });
            expect(gameAfter).to.include({
                dateAdded: olderDate,
                dateModified: newerDate,
                id: 1,
                lastPlayedDate: newerDate,
                launchboxId: 'uuid',
            });
        });

        it('when xml game is older than database but was played after database modification', async () => {
            // Launchbox doesn't update DateModified when it changes play count and LastPlayedDate, so we have to check both dates
            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${olderDate}</DateModified><LastPlayedDate>${newerDate}</LastPlayedDate></Game></LaunchBox>`
                );
            await database.game.updateMany(
                {},
                {
                    $set: {
                        dateAdded: olderDate,
                        dateModified: newerDate,
                        lastPlayedDate: olderDate,
                        launchboxId,
                    },
                }
            );
            await syncLaunchboxToDb(
                launchboxPath,
                launchboxPlatform,
                true,
                database
            );
            const gameAfter = await database.game.findOne({
                id: 1,
            });
            expect(gameAfter).to.include({
                dateAdded: olderDate,
                dateModified: newerDate,
                id: 1,
                lastPlayedDate: newerDate,
                launchboxId: 'uuid',
            });
        });

        it('throws when database throws', async () => {
            database = await initDatabase({
                database: 'nedb',
                nedbExtension: '',
            });
            await database.game.retrieveFromDb(1);

            sinon
                .stub(fs, 'readFileSync')
                .returns(
                    `<LaunchBox><Game><ID>${launchboxId}</ID><DateModified>${newerDate}</DateModified><LastPlayedDate>${olderDate}</LastPlayedDate></Game></LaunchBox>`
                );
            await database.game.updateMany(
                {},
                {
                    $set: {
                        dateAdded: olderDate,
                        dateModified: olderDate,
                        lastPlayedDate: newerDate,
                        launchboxId,
                    },
                }
            );
            sinon
                .stub(database.game, 'save')
                .rejects(new Error('failed to save'));
            return expect(
                syncLaunchboxToDb(
                    launchboxPath,
                    launchboxPlatform,
                    true,
                    database
                )
            ).to.eventually.be.rejectedWith('failed to save');
        });
    });
});
