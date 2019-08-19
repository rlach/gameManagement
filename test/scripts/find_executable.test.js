const sinon = require('sinon');
const fs = require('fs');
const files = require('../../src/util/files');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const path = require('path');

const {
    updateExecutableAndDirectory,
} = require('../../src/scripts/build_db_from_folders/find_executable');

describe('findExecutable', function() {
    const searchSettings = { maxSearchDepth: 1 };

    const file = {
        name: 'gameName',
        path: 'gameDirectory',
    };
    let database;

    beforeEach(async () => {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('does not update game if executableFile exists', async () => {
        const game = await database.game.retrieveFromDb('1');
        game.executableFile = 'something';
        database.game.save(game);

        await updateExecutableAndDirectory(file, game, database);
        const deletedGame = await database.game.findOne({});
        expect(deletedGame).to.eql(game);
    });

    it('forces update when executable exists but force update is true', async () => {
        const game = await database.game.retrieveFromDb('1');
        game.executableFile = 'something';
        game.forceExecutableUpdate = true;
        database.game.save(game);
        sinon.stub(fs, 'readdirSync').returns([]);
        await updateExecutableAndDirectory(
            file,
            game,
            {
                maxSearchDepth: 1,
            },
            database
        );
        const deletedGame = await database.game.findOne({});
        expect(deletedGame).to.contain({
            id: '1',
            deleted: true,
        });
    });

    describe('mark as deleted', () => {
        it('marks game as deleted when there are no subdirectories', async () => {
            const game = await database.game.retrieveFromDb('1');
            sinon.stub(fs, 'readdirSync').returns([]);
            await updateExecutableAndDirectory(
                file,
                game,
                {
                    maxSearchDepth: 1,
                },
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                id: '1',
                deleted: true,
            });
        });

        it('marks game as deleted when there is subdirectory called DELETED', async () => {
            const game = await database.game.retrieveFromDb('1');
            sinon.stub(fs, 'readdirSync').returns(['DELETED']);
            await updateExecutableAndDirectory(
                file,
                game,
                {
                    maxSearchDepth: 1,
                },
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                id: '1',
                deleted: true,
            });
        });
    });

    describe('base directory', () => {
        it('sets base directory when subdirectory exists', async () => {
            sinon.stub(files, 'findByFilter').returns([]);
            const game = await database.game.retrieveFromDb('1');
            sinon.stub(fs, 'readdirSync').returns(['versionDirectory']);
            await updateExecutableAndDirectory(
                file,
                game,
                {
                    maxSearchDepth: 1,
                },
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
                id: '1',
                deleted: false,
            });
        });

        it('sets base directory to first subdirectory from the response list', async () => {
            sinon.stub(files, 'findByFilter').returns([]);
            const game = await database.game.retrieveFromDb('1');
            sinon
                .stub(fs, 'readdirSync')
                .returns([
                    'versionDirectory1',
                    'versionDirectory2',
                    'versionDirectory3',
                ]);
            await updateExecutableAndDirectory(
                file,
                game,
                searchSettings,
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory1'
                ),
                id: '1',
                deleted: false,
            });
        });
    });

    describe('executable file', () => {
        let game;
        beforeEach(async () => {
            game = await database.game.retrieveFromDb('1');
            sinon.stub(fs, 'readdirSync').returns(['versionDirectory']);
        });

        it('sets executable file to returned one if only one exists', async () => {
            sinon.stub(files, 'findByFilter').returns([
                {
                    name: 'foo.bar',
                    relative: 'foo.bar',
                    base: 'gameBase',
                },
            ]);

            await updateExecutableAndDirectory(
                file,
                game,
                searchSettings,
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                executableFile: path.resolve('gameBase/foo.bar'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
                id: '1',
                deleted: false,
            });
        });

        it('sets executable file to one starting with game if there is one', async () => {
            sinon.stub(files, 'findByFilter').returns([
                {
                    name: 'foo.bar',
                    relative: 'foo.bar',
                    base: 'gameBase',
                },
                {
                    name: 'Game.bar',
                    relative: 'Game.bar',
                    base: 'gameBase',
                },
            ]);

            await updateExecutableAndDirectory(
                file,
                game,
                searchSettings,
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                executableFile: path.resolve('gameBase/Game.bar'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
                id: '1',
                deleted: false,
            });
        });

        it('sets executable file to one ending with exe if there is one', async () => {
            sinon.stub(files, 'findByFilter').returns([
                {
                    name: 'foo.bar',
                    relative: 'foo.bar',
                    base: 'gameBase',
                },
                {
                    name: 'foo.exe',
                    relative: 'foo.exe',
                    base: 'gameBase',
                },
            ]);

            await updateExecutableAndDirectory(
                file,
                game,
                searchSettings,
                database
            );
            const deletedGame = await database.game.findOne({});
            expect(deletedGame).to.contain({
                executableFile: path.resolve('gameBase/foo.exe'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
                id: '1',
                deleted: false,
            });
        });
    });
});
