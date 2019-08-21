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

    beforeEach(async function() {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('base directory', function() {
        it('returns base directory when there are no subdirectories', async function() {
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
                directory: path.resolve('gameDirectory/gameName'),
            });
        });

        it('sets base directory when subdirectory exists', async function() {
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

        it('sets base directory to first subdirectory from the response list', async function() {
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

    describe('executable file', function() {
        let game;
        beforeEach(async function() {
            game = await database.game.retrieveFromDb('1');
            sinon.stub(fs, 'readdirSync').returns(['versionDirectory']);
        });

        it('sets executable file to returned one if only one exists', async function() {
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

        it('sets executable file to one starting with game if there is one', async function() {
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

        it('sets executable file to one ending with exe if there is one', async function() {
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
