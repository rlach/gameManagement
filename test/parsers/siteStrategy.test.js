const sinon = require('sinon');
const { expect } = require('chai');
const SiteStrategy = require('../../src/parsers/siteStrategy');
const settings = require('../../src/settings-sample');

describe('Site strategy', function() {
    let siteStrategy;
    const scores = settings.advanced.scores;
    beforeEach(async () => {
        siteStrategy = new SiteStrategy('dummy', settings);
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('fetch game data returns empty object', async () => {
        expect(
            await siteStrategy.fetchGameData('anything', 'anything', 'path')
        ).to.eql({});
    });

    it('returns empty string for extract code', async () => {
        expect(siteStrategy.extractCode('anything')).to.eql('');
    });

    it('returns empty array for find game', async () => {
        expect(await siteStrategy.findGame('anything')).to.eql([]);
    });

    it('returns undefined for getAdditionalImages', async () => {
        expect(await siteStrategy.getAdditionalImages('anything')).to.eql(
            undefined
        );
    });

    it('should use returns false', async () => {
        expect(await siteStrategy.shouldUse('other1')).to.eql(false);
    });

    describe('scoring codes', () => {
        it('returns empty array when there are no found codes', () => {
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

        it('gives no points to extracted code', () => {
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

        it('returns 2 points for the only code found', () => {
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
                    score: scores.onlyOneResultExists + scores.resultExists,
                    strategy: 'dummy',
                },
            ]);
        });
    });
});
