const sinon = require('sinon');
const fs = require('fs');

const findPossibleDuplicates = require('../../src/scripts/find_possible_duplicates');

describe('findPossibleDuplicates', function() {
    let writeStub;
    beforeEach(async () => {
        writeStub = sinon.stub(fs, 'writeFileSync');
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Calls read dir once per main path', async () => {
        const readdirStub = sinon.stub(fs, 'readdirSync').returns([]);
        const result = findPossibleDuplicates(['mainPath1', 'mainPath2']);
        sinon.assert.calledTwice(readdirStub);
        sinon.assert.calledWith(writeStub, 'duplicates.txt', '{}');
    });

    it('When directory has no subdirectories writes it to file with -1 count', async () => {
        sinon
            .stub(fs, 'readdirSync')
            .onFirstCall()
            .returns(['directory'])
            .onSecondCall()
            .returns([]);
        findPossibleDuplicates(['mainPath']);
        sinon.assert.calledWith(
            writeStub,
            'duplicates.txt',
            JSON.stringify({ directory: -1 }, null, 4)
        );
    });

    it('Writes empty object when all directories have up to 1 subdirectory', async () => {
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
        sinon.assert.calledWith(writeStub, 'duplicates.txt', '{}');
    });

    it('Writes object with directories that have 2 subdirectories with score of 1', async () => {
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
        sinon.assert.calledWith(
            writeStub,
            'duplicates.txt',
            JSON.stringify({ directory: 1 }, null, 4)
        );
    });

    it('Writes object with directories that have more subdirectories with score increasing for each additional directory', async () => {
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
        sinon.assert.calledWith(
            writeStub,
            'duplicates.txt',
            JSON.stringify({ directory: 3 }, null, 4)
        );
    });

    describe('when accepted versions file exists', () => {
        it('writes results as normal when versions in file do not match found versions', async () => {
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
            sinon.assert.calledWith(
                writeStub,
                'duplicates.txt',
                JSON.stringify({ directory: 1 }, null, 4)
            );
        });

        it('counts all mentioned versions as one game', async () => {
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
            sinon.assert.calledWith(writeStub, 'duplicates.txt', '{}');
        });
    });
});
