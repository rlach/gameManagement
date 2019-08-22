const sinon = require('sinon');
const fs = require('fs');
const files = require('../../src/util/files');
const { expect } = require('chai');
const path = require('path');

const {
    findExecutableAndDirectory,
} = require('../../src/scripts/scan_directories/find_executable');

describe('findExecutable', function() {
    let searchSettings;

    const file = {
        name: 'gameName',
        path: 'gameDirectory',
    };

    beforeEach(async function() {
        searchSettings = {
            maxSearchDepth: 1,
            bannedFilenames: [],
            executableExtensions: [],
        };
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('base directory', function() {
        it('returns base directory when there are no subdirectories', async function() {
            sinon.stub(fs, 'readdirSync').returns([]);

            const result = await findExecutableAndDirectory(file, {
                maxSearchDepth: 1,
            });
            expect(result).to.eql({
                directory: path.resolve('gameDirectory/gameName'),
            });
        });

        it('sets base directory when subdirectory exists', async function() {
            sinon.stub(files, 'findByFilter').returns([]);
            sinon.stub(fs, 'readdirSync').returns(['versionDirectory']);
            const result = await findExecutableAndDirectory(file, {
                maxSearchDepth: 1,
            });
            expect(result).to.eql({
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
            });
        });

        it('sets base directory to first subdirectory from the response list', async function() {
            sinon.stub(files, 'findByFilter').returns([]);
            sinon
                .stub(fs, 'readdirSync')
                .returns([
                    'versionDirectory1',
                    'versionDirectory2',
                    'versionDirectory3',
                ]);
            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.eql({
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory1'
                ),
            });
        });
    });

    describe('executable file', function() {
        beforeEach(async function() {
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

            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.eql({
                executableFile: path.resolve('gameBase/foo.bar'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
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

            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.eql({
                executableFile: path.resolve('gameBase/Game.bar'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
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

            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.eql({
                executableFile: path.resolve('gameBase/foo.exe'),
                directory: path.resolve(
                    'gameDirectory/gameName/versionDirectory'
                ),
            });
        });
    });

    describe('filters', function() {
        it('finds only filenames matching executable extensions', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .returns(['banana', 'foo.exe', 'bar.swf']);
            searchSettings.executableExtensions = ['.exe', '.swf'];
            stubFindFiles(['banana', 'foo.exe', 'bar.swf']);

            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.include({
                executableFile: path.resolve('basefoo.exe/foo.exe'),
            });
        });

        it('finds ignores filenames that match the extension and are on banned list', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .returns(['banana', 'foo.exe', 'bar.swf']);
            searchSettings.executableExtensions = ['.exe', '.swf'];
            searchSettings.bannedFilenames = ['foo', 'bar'];
            stubFindFiles(['banana', 'foo.exe', 'bar.swf', 'yo.exe']);

            const result = await findExecutableAndDirectory(
                file,
                searchSettings
            );
            expect(result).to.include({
                executableFile: path.resolve('baseyo.exe/yo.exe'),
            });
        });
    });
});

function stubFindFiles(filesToMatch) {
    let filesToMatchMapped = filesToMatch.map(f => ({
        matcher: f,
        name: f,
        file: f,
        base: `base${f}`,
        relative: f,
    }));
    return sinon.stub(files, 'findByFilter').callsFake((path, callback) => {
        let result = [];
        for (let v of filesToMatchMapped) {
            if (callback(v)) {
                result.push(v);
            }
        }
        return result;
    });
}
