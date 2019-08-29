const sinon = require('sinon');
const settings = require('../../src/util/settings');

describe('files.js', function() {
    let exitStub;
    beforeEach(async function() {
        exitStub = sinon.stub(process, 'exit');
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('quits process when settings are empty', async function() {
        settings.validate({});
        sinon.assert.calledWithExactly(exitStub, 1);
    });

    it('continues when settings are fine', async function() {
        settings.validate({
            launchboxPlatform: 'WINDOWS',
            paths: {
                launchbox: './sample/launchbox',
                main: ['./sample/games/dlsite'],
                unsortedGames: './sample/games/unsorted',
                targetSortFolder: './sample/games/dlsite',
                backup: '.',
            },
            updateDpi: true,
            exeSearchDepth: 2,
            executableExtensions: ['.exe'],
            bannedFilenames: ['セーブデータ場所設定ツール'],
            externalIdField: 'SortTitle',
            preferredLanguage: 'en',
            preferredImageSource: 'en',
            downloadImages: true,
            onlyUpdateNewer: true,
            organizeDirectories: {
                minimumScoreToAccept: 6,
                minimumScoreToAsk: 2,
                shouldAsk: true,
                maxResultsToSuggest: 6,
                scores: {
                    resultExists: 1,
                    onlyOneResultExists: 1,
                    extractedDlsiteCode: 3,
                    matchForExtractedDlsiteCode: 3,
                    exactMatch: 3,
                    noSpaceExactMatch: 3,
                    originalIncludesMatch: 2,
                    matchIncludesOriginal: 2,
                    noSpaceOriginalIncludesMatch: 2,
                    noSpaceMatchIncludesOriginal: 2,
                },
            },
            logLevel: 'info',
            database: {
                database: 'nedb',
                nedbExtension: '.db',
                mongoUri: 'mongodb://localhost/test',
            },
        });
        sinon.assert.notCalled(exitStub);
    });
});
