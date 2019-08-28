const sinon = require('sinon');
const { expect } = require('chai');
const SiteStrategy = require('../../src/parsers/siteStrategy');

describe('Site strategy', function() {
    let siteStrategy;
    beforeEach(async function() {
        siteStrategy = new SiteStrategy('dummy');
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
