const sinon = require('sinon');
const { expect } = require('chai');
const fs = require('fs');
const OtherStrategy = require('../../src/parsers/other');

describe('Other strategy', function() {
    let otherStrategy;
    beforeEach(async function() {
        const settings = {
            organizeDirectories: {
                scores: {},
            },
        };

        otherStrategy = new OtherStrategy(settings);
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', function() {
        it('returns name of final element of the path given', async function() {
            sinon.stub(fs, 'readdirSync').returns([
                {
                    isDirectory: () => true,
                    name: 'foobar',
                },
            ]);
            expect(
                await otherStrategy.fetchGameData(
                    'anything',
                    'anything',
                    '/foo/bar/path/gamename'
                )
            ).to.eql({
                nameEn: 'gamename',
            });
        });
    });

    it('returns empty string for extract code', async function() {
        expect(otherStrategy.extractCode('anything')).to.eql('');
    });

    it('returns empty array for find game', async function() {
        expect(await otherStrategy.findGame('anything')).to.eql([]);
    });

    it('returns undefined for getAdditionalImages', async function() {
        expect(await otherStrategy.getAdditionalImages('anything')).to.eql(
            undefined
        );
    });

    describe('should use', function() {
        it('returns true when name starts with other and has a number', async function() {
            expect(await otherStrategy.shouldUse('other1')).to.eql(true);
            expect(await otherStrategy.shouldUse('other12')).to.eql(true);
            expect(await otherStrategy.shouldUse('other123456789')).to.eql(
                true
            );
            expect(await otherStrategy.shouldUse('other007')).to.eql(true);
        });

        it('returns false when name starts with other string and has a number', async function() {
            expect(await otherStrategy.shouldUse('v112')).to.eql(false);
            expect(await otherStrategy.shouldUse('RJ123456')).to.eql(false);
        });

        it('returns false when name is only a number', async function() {
            expect(await otherStrategy.shouldUse('2112')).to.eql(false);
        });
    });

    it('returns empty array when scoring codes', function() {
        expect(
            otherStrategy.scoreCodes(
                {
                    extractedCode: 'anything',
                    foundCodes: [
                        {
                            workno: 1,
                            work_name: 'anything',
                        },
                    ],
                },
                'anything'
            )
        ).to.eql([]);
    });
});
