const sinon = require('sinon');
const { expect } = require('chai');
const SiteStrategy = require('../../src/parsers/siteStrategy');

describe('Site strategy', function() {
    let siteStrategy;
    beforeEach(async function() {
        const settings = {
            organizeDirectories: {
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
        };

        siteStrategy = new SiteStrategy('dummy', settings);
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('fetch game data returns empty object', async function() {
        expect(
            await siteStrategy.fetchGameData('anything', 'anything', 'path')
        ).to.eql({});
    });

    it('returns empty string for extract code', async function() {
        expect(siteStrategy.extractCode('anything')).to.eql('');
    });

    it('returns empty array for find game', async function() {
        expect(await siteStrategy.findGame('anything')).to.eql([]);
    });

    it('returns undefined for getAdditionalImages', async function() {
        expect(await siteStrategy.getAdditionalImages('anything')).to.eql(
            undefined
        );
    });

    it('should use returns false', async function() {
        expect(await siteStrategy.shouldUse('other1')).to.eql(false);
    });

    describe('test expected sites', function() {
        it('maps diff to test result', async function() {
            const actual = { foo: 'fetched this' };
            expect(
                siteStrategy.test('test', actual, { foo: 'was this' }, 'foo')
            ).to.eql({
                description: 'test',
                diff:
                    ' {\n\u001b[31m-  foo: "was this"\u001b[39m\n\u001b[32m+  foo: "fetched this"\u001b[39m\n }\n',
                passes: false,
                strategy: 'dummy',
                fieldName: 'foo',
                actual,
            });
        });

        it('maps success to test result', async function() {
            const actual = { foo: 'bar' };
            expect(
                siteStrategy.test('test', actual, { foo: 'bar' }, 'foo')
            ).to.eql({
                description: 'test',
                diff: '',
                passes: true,
                strategy: 'dummy',
                fieldName: 'foo',
                actual,
            });
        });

        it('known arrays are equal even if order is different', async function() {
            const actual = {
                tagsEn: ['elem1', 'elem2'],
                tagsJp: ['elem1', 'elem2'],
                genresEn: ['elem1', 'elem2'],
                genresJp: ['elem1', 'elem2'],
                additionalImages: ['elem1', 'elem2'],
            };
            expect(
                siteStrategy.test(
                    'test',
                    actual,
                    {
                        tagsEn: ['elem2', 'elem1'],
                        tagsJp: ['elem2', 'elem1'],
                        genresEn: ['elem2', 'elem1'],
                        genresJp: ['elem2', 'elem1'],
                        additionalImages: ['elem2', 'elem1'],
                    },
                    'foo'
                )
            ).to.eql({
                description: 'test',
                diff: '',
                passes: true,
                strategy: 'dummy',
                fieldName: 'foo',
                actual,
            });
        });

        it('unknown arrays return diff when order of items is different', async function() {
            const actual = {
                arr: ['elem1', 'elem2'],
            };
            expect(
                siteStrategy.test(
                    'test',
                    actual,
                    {
                        arr: ['elem2', 'elem1'],
                    },
                    'foo'
                )
            ).to.eql({
                description: 'test',
                diff:
                    ' {\n   arr: [\n\u001b[32m+    "elem1"\u001b[39m\n     "elem2"\n\u001b[31m-    "elem1"\u001b[39m\n   ]\n }\n',
                passes: false,
                strategy: 'dummy',
                fieldName: 'foo',
                actual,
            });
        });
    });

    describe('scoring codes', function() {
        it('returns empty array when there are no found codes', async function() {
            expect(
                siteStrategy.scoreCodes(
                    {
                        extractedCode: '',
                        foundCodes: [],
                    },
                    'anything'
                )
            ).to.eql([]);
        });

        it('gives no points to extracted code', async function() {
            expect(
                siteStrategy.scoreCodes(
                    {
                        extractedCode: 'anything',
                        foundCodes: [],
                    },
                    'anything'
                )
            ).to.eql([]);
        });

        it('returns points for being the only code found', async function() {
            expect(
                siteStrategy.scoreCodes(
                    {
                        extractedCode: 'something',
                        foundCodes: [
                            {
                                workno: 1,
                                work_name: 'other',
                            },
                        ],
                    },
                    'anything'
                )
            ).to.eql([
                {
                    code: 1,
                    name: 'other',
                    score: 2,
                    strategy: 'dummy',
                },
            ]);
        });
    });
});
