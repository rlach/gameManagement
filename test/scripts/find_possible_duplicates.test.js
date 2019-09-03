const sinon = require('sinon');
const fs = require('fs');
const Hjson = require('hjson');

const findPossibleDuplicates = require('../../src/scripts/find_possible_duplicates');

describe('findPossibleDuplicates', function() {
    let writeStub;
    const hjsonOptions = {
        bracesSameLine: true,
    };

    beforeEach(async function() {
        writeStub = sinon.stub(fs, 'writeFileSync');
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Calls read dir once per main path', async function() {
        const readdirStub = sinon.stub(fs, 'readdirSync').returns([]);
        findPossibleDuplicates(['mainPath1', 'mainPath2']);
        sinon.assert.calledTwice(readdirStub);
        sinon.assert.calledWithExactly(writeStub, 'duplicates.txt', '{}');
    });

    describe('game appears in single directory', function() {
        it('When directory has no subdirectories and no sub-files does not write anything to results', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns([]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                JSON.stringify({}, null, 4)
            );
        });

        it('When directory has no subdirectories but some sub-files writes wrong structure to results', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns([
                    {
                        name: 'game.exe',
                        isDirectory: () => false,
                    },
                ]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                Hjson.stringify(
                    {
                        directory: {
                            status: 'has wrong structure',
                            'mainPath/directory': 'wrong structure',
                        },
                    },
                    hjsonOptions
                )
            );
        });

        it('Writes empty object when all directories have up to 1 subdirectory', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns([
                    {
                        name: 'directory',
                        path: 'path',
                    },
                ])
                .onSecondCall()
                .returns([
                    {
                        isDirectory: () => true,
                        name: 'version1',
                    },
                ]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(writeStub, 'duplicates.txt', '{}');
        });

        it('Writes object with directories that have 2 subdirectories not mentioned in versions.txt', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns([
                    {
                        isDirectory: () => true,
                        name: 'version1',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version2',
                    },
                ]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                Hjson.stringify(
                    {
                        directory: {
                            status: '2 duplicate(s)',
                            'mainPath/directory': '2 duplicate(s)',
                        },
                    },
                    hjsonOptions
                )
            );
        });

        it('Writes object with directories that have more versions than 2', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns([
                    {
                        isDirectory: () => true,
                        name: 'version1',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version2',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version3',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version4',
                    },
                ]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                Hjson.stringify(
                    {
                        directory: {
                            status: '4 duplicate(s)',
                            'mainPath/directory': '4 duplicate(s)',
                        },
                    },
                    hjsonOptions
                )
            );
        });

        it('If multiple games have more than 2 versions orders them with most versions at the top', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory', 'directory2'])
                .onSecondCall()
                .returns([
                    {
                        isDirectory: () => true,
                        name: 'version1',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version2',
                    },
                ])
                .onThirdCall()
                .returns([
                    {
                        isDirectory: () => true,
                        name: 'version1',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version2',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version3',
                    },
                    {
                        isDirectory: () => true,
                        name: 'version4',
                    },
                ]);
            findPossibleDuplicates(['mainPath']);
            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                Hjson.stringify(
                    {
                        directory2: {
                            status: '4 duplicate(s)',
                            'mainPath/directory2': '4 duplicate(s)',
                        },
                        directory: {
                            status: '2 duplicate(s)',
                            'mainPath/directory': '2 duplicate(s)',
                        },
                    },
                    hjsonOptions
                )
            );
        });

        describe('when accepted versions file exists', function() {
            it('writes results as normal when versions in file do not match found versions', async function() {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon.stub(fs, 'readFileSync').returns('other stuff');

                sinon
                    .stub(fs, 'readdirSync')
                    .onFirstCall()
                    .returns(['directory'])
                    .onSecondCall()
                    .returns([
                        {
                            isDirectory: () => true,
                            name: 'version1',
                        },
                        {
                            isDirectory: () => true,
                            name: 'version2',
                        },
                    ]);
                findPossibleDuplicates(['mainPath']);
                sinon.assert.calledWithExactly(
                    writeStub,
                    'duplicates.txt',
                    Hjson.stringify(
                        {
                            directory: {
                                status: '2 duplicate(s)',
                                'mainPath/directory': '2 duplicate(s)',
                            },
                        },
                        hjsonOptions
                    )
                );
            });

            it('counts all mentioned versions as one game', async function() {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon.stub(fs, 'readFileSync').returns('version1\nversion2');

                sinon
                    .stub(fs, 'readdirSync')
                    .onFirstCall()
                    .returns(['directory'])
                    .onSecondCall()
                    .returns([
                        {
                            isDirectory: () => true,
                            name: 'version1',
                        },
                        {
                            isDirectory: () => true,
                            name: 'version2',
                        },
                    ]);
                findPossibleDuplicates(['mainPath']);
                sinon.assert.calledWithExactly(
                    writeStub,
                    'duplicates.txt',
                    '{}'
                );
            });

            it('writes a problem when more files are in versions.txt than actually exist', async function() {
                sinon.stub(fs, 'existsSync').returns(true);
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('version1\nversion2\nversion3');

                sinon
                    .stub(fs, 'readdirSync')
                    .onFirstCall()
                    .returns(['directory'])
                    .onSecondCall()
                    .returns([
                        {
                            isDirectory: () => true,
                            name: 'version1',
                        },
                        {
                            isDirectory: () => true,
                            name: 'version2',
                        },
                    ]);
                findPossibleDuplicates(['mainPath']);
                sinon.assert.calledWithExactly(
                    writeStub,
                    'duplicates.txt',
                    Hjson.stringify(
                        {
                            directory: {
                                status: 'has wrong version.txt',
                                'mainPath/directory': 'wrong version.txt',
                            },
                        },
                        hjsonOptions
                    )
                );
            });
        });
    });

    describe('game appears in multiple directories', function() {
        it('When all directory have no subdirectories and no sub-files does not write anything to results', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns(['directory'])
                .onThirdCall()
                .returns([])
                .onCall(3)
                .returns([]);

            findPossibleDuplicates(['mainPath', 'mainPath2']);

            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                JSON.stringify({}, null, 4)
            );
        });

        it('When one directory has version but second has broken structure', async function() {
            sinon
                .stub(fs, 'readdirSync')
                .onFirstCall()
                .returns(['directory'])
                .onSecondCall()
                .returns(['directory'])
                .onThirdCall()
                .returns([
                    {
                        name: 'version',
                        isDirectory: () => true,
                    },
                ])
                .onCall(3)
                .returns([
                    {
                        name: 'game.exe',
                        isDirectory: () => false,
                    },
                ]);

            findPossibleDuplicates(['mainPath', 'mainPath2']);

            sinon.assert.calledWithExactly(
                writeStub,
                'duplicates.txt',
                Hjson.stringify(
                    {
                        directory: {
                            status: 'has wrong structure',
                            'mainPath/directory': '1 duplicate(s)',
                            'mainPath2/directory': 'wrong structure',
                        },
                    },
                    hjsonOptions
                )
            );
        });
    });
});
