const sinon = require('sinon');
const { expect } = require('chai');
const fs = require('fs');
const otherStrategy = require('../../src/parsers/other');

describe('Other strategy', function() {
    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', () => {
        it('returns empty object when given game has no subfiles', async () => {
            sinon.stub(fs, 'readdirSync').returns([]);
            expect(
                await otherStrategy.fetchGameData(
                    'anything',
                    'anything',
                    'path'
                )
            ).to.eql({});
        });

        it('returns empty object when given game has no subdirectories', async () => {
            sinon.stub(fs, 'readdirSync').returns([
                {
                    isDirectory: () => false,
                },
            ]);
            expect(
                await otherStrategy.fetchGameData(
                    'anything',
                    'anything',
                    'path'
                )
            ).to.eql({});
        });

        it('returns name of first subdirectory found', async () => {
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
                    'path'
                )
            ).to.eql({
                nameEn: 'foobar',
            });
        });
    });

    it('returns empty string for extract code', async () => {
        expect(otherStrategy.extractCode('anything')).to.eql('');
    });

    it('returns empty array for find game', async () => {
        expect(await otherStrategy.findGame('anything')).to.eql([]);
    });

    it('returns undefined for getAdditionalImages', async () => {
        expect(await otherStrategy.getAdditionalImages('anything')).to.eql(
            undefined
        );
    });

    describe('should use', () => {
        it('returns true when name starts with other and has a number', async () => {
            expect(await otherStrategy.shouldUse('other1')).to.eql(true);
            expect(await otherStrategy.shouldUse('other12')).to.eql(true);
            expect(await otherStrategy.shouldUse('other123456789')).to.eql(
                true
            );
            expect(await otherStrategy.shouldUse('other007')).to.eql(true);
        });

        it('returns false when name starts with other string and has a number', async () => {
            expect(await otherStrategy.shouldUse('v112')).to.eql(false);
            expect(await otherStrategy.shouldUse('RJ123456')).to.eql(false);
        });

        it('returns false when name is only a number', async () => {
            expect(await otherStrategy.shouldUse('2112')).to.eql(false);
        });
    });

    it('returns empty array when scoring codes', () => {
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
