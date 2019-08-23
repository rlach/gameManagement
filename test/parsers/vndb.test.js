const sinon = require('sinon');
const { expect } = require('chai');
const vndb = require('../../src/util/vndb');
const VndbStrategy = require('../../src/parsers/vndb');

describe('Vndb strategy', function() {
    let vndbStrategy;
    beforeEach(async function() {
        const settings = {
            advanced: {
                scores: {},
            },
        };

        vndbStrategy = new VndbStrategy(settings);
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', function() {
        it('returns empty object when vndb returns empty object', async function() {
            sinon.stub(vndb, 'getVNById').resolves({});

            expect(
                await vndbStrategy.fetchGameData('12345', 'anything', 'path')
            ).to.eql({});
        });

        it('passes vndb object', async function() {
            sinon.stub(vndb, 'getVNById').resolves({
                something: 'something',
            });

            expect(
                await vndbStrategy.fetchGameData('12345', 'anything', 'path')
            ).to.eql({
                something: 'something',
            });
        });

        it('parses game id into number', async function() {
            const getVNByIdStub = sinon.stub(vndb, 'getVNById').resolves({});

            expect(
                await vndbStrategy.fetchGameData('12345', 'anything', 'path')
            ).to.eql({});
            sinon.assert.calledWithExactly(getVNByIdStub, 12345);
        });

        it('replaces v in gameId if it exists', async function() {
            const getVNByIdStub = sinon.stub(vndb, 'getVNById').resolves({});

            expect(
                await vndbStrategy.fetchGameData('v12345', 'anything', 'path')
            ).to.eql({});
            sinon.assert.calledWithExactly(getVNByIdStub, 12345);
        });
    });

    it('passes vndb object when findGame is called', async function() {
        const findVNsByNameStub = sinon.stub(vndb, 'findVNsByName').resolves({
            something: 'something',
        });

        expect(await vndbStrategy.findGame('name')).to.eql({
            something: 'something',
        });
        sinon.assert.calledWithExactly(findVNsByNameStub, 'name');
    });

    describe('additional images', function() {
        it('calls fetchGameData and returns images from there', async function() {
            const fetchGameDataStub = sinon
                .stub(vndbStrategy, 'fetchGameData')
                .resolves({
                    additionalImages: ['something', 'something2'],
                });

            expect(await vndbStrategy.getAdditionalImages('v12345')).to.eql([
                'something',
                'something2',
            ]);
            sinon.assert.calledWithExactly(fetchGameDataStub, 'v12345');
        });

        it('returns undefined if fetchGameData returns nothing', async function() {
            const fetchGameDataStub = sinon
                .stub(vndbStrategy, 'fetchGameData')
                .resolves({});

            expect(await vndbStrategy.getAdditionalImages('v12345')).to.eql(
                undefined
            );
            sinon.assert.calledWithExactly(fetchGameDataStub, 'v12345');
        });
    });

    describe('should use', function() {
        it('returns true for numbers starting with v', async function() {
            expect(vndbStrategy.shouldUse('v1')).to.eql(true);
            expect(vndbStrategy.shouldUse('v192')).to.eql(true);
            expect(vndbStrategy.shouldUse('v192144')).to.eql(true);
        });

        it('returns false if code does not start with v', async function() {
            expect(vndbStrategy.shouldUse('av1')).to.eql(false);
            expect(vndbStrategy.shouldUse('RJ1123213')).to.eql(false);
            expect(vndbStrategy.shouldUse('VJ1123213')).to.eql(false);
            expect(vndbStrategy.shouldUse('d_1231231')).to.eql(false);
        });

        it('returns false if code does not contain number', async function() {
            expect(vndbStrategy.shouldUse('v')).to.eql(false);
        });
    });

    describe('extract code', function() {
        it('returns code if there is exact match', async function() {
            expect(vndbStrategy.extractCode('v12345')).to.eql('v12345');
        });

        it('returns code if it is inside text', async function() {
            expect(vndbStrategy.extractCode('[v12345] text')).to.eql('v12345');
            expect(vndbStrategy.extractCode('text [v12345] text')).to.eql(
                'v12345'
            );
            expect(vndbStrategy.extractCode('text text (v12345)')).to.eql(
                'v12345'
            );
            expect(vndbStrategy.extractCode('text text v12345')).to.eql(
                'v12345'
            );
            expect(vndbStrategy.extractCode('text v12345text')).to.eql(
                'v12345'
            );
            expect(vndbStrategy.extractCode('text v12345text324')).to.eql(
                'v12345'
            );
        });

        it('returns empty string when there is no match', async function() {
            expect(vndbStrategy.extractCode('f12325')).to.eql('');
        });
    });
});
