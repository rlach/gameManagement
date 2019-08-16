const sinon = require('sinon');
const Chai = require('chai');
const { expect } = Chai;
const ChaiPromised = require('chai-as-promised');
const request = require('request-promise');
const dlsiteStrategy = require('../../src/parsers/dlsite');

Chai.use(ChaiPromised);

describe('Dlsite strategy', function() {
    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', () => {
        it('returns undefined when using from code for strategy', async () => {
            expect(await dlsiteStrategy.fetchGameData('anything')).to.eql(
                undefined
            );
        });
    });

    describe('extract code', () => {
        it('returns empty string when there is no code', async () => {
            expect(dlsiteStrategy.extractCode('anything')).to.eql('');
        });

        it('returns code when it is in the string', async () => {
            expect(dlsiteStrategy.extractCode('RJ123456')).to.eql('RJ123456');
            expect(dlsiteStrategy.extractCode('[RJ123456] something')).to.eql(
                'RJ123456'
            );
            expect(dlsiteStrategy.extractCode('something (RJ123456)')).to.eql(
                'RJ123456'
            );
            expect(dlsiteStrategy.extractCode('something (RE123456)')).to.eql(
                'RE123456'
            );
            expect(dlsiteStrategy.extractCode('something (VJ123456)')).to.eql(
                'VJ123456'
            );
        });
    });

    describe('find game', () => {
        it('returns empty array when all sites return empty work arrays', async () => {
            const getRequest = sinon.stub(request, 'get').returns(
                JSON.stringify({
                    work: [],
                })
            );

            expect(await dlsiteStrategy.findGame('anything')).to.eql([]);
            sinon.assert.callCount(getRequest, 6);
        });

        it('returns results from all sites that returned data', async () => {
            const responseItem = {
                work_name: 'name',
                workno: 123,
            };

            const getRequest = sinon.stub(request, 'get').returns(
                JSON.stringify({
                    work: [responseItem],
                })
            );

            expect(await dlsiteStrategy.findGame('anything')).to.eql([
                responseItem,
                responseItem,
                responseItem,
            ]);
            sinon.assert.callCount(getRequest, 3);
        });

        it('retries only result that returned no data', async () => {
            const responseItem = {
                work_name: 'name',
                workno: 123,
            };

            const getRequest = sinon
                .stub(request, 'get')
                .onFirstCall()
                .returns(
                    JSON.stringify({
                        work: [],
                    })
                )
                .returns(
                    JSON.stringify({
                        work: [responseItem],
                    })
                );

            expect(await dlsiteStrategy.findGame('anything')).to.eql([
                responseItem,
                responseItem,
                responseItem,
            ]);
            sinon.assert.callCount(getRequest, 4);
        });
    });

    describe('get additional images', () => {
        it('returns undefined when using wrong code for the strategy', async () => {
            expect(await dlsiteStrategy.getAdditionalImages('anything')).to.eql(
                undefined
            );
        });
    });

    describe('should use', () => {
        it('returns true when name starts with VJ', async () => {
            expect(await dlsiteStrategy.shouldUse('VJ1')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('VJ12')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('VJ123456789')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('VJ007')).to.eql(true);
        });

        it('returns true when name starts with RJ', async () => {
            expect(await dlsiteStrategy.shouldUse('RJ1')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RJ12')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RJ123456789')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RJ007')).to.eql(true);
        });

        it('returns true when name starts with RE', async () => {
            expect(await dlsiteStrategy.shouldUse('RE1')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RE12')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RE123456789')).to.eql(true);
            expect(await dlsiteStrategy.shouldUse('RE007')).to.eql(true);
        });

        it('returns false when name starts with other things than RJ, VJ, RE', async () => {
            expect(await dlsiteStrategy.shouldUse('aRE1')).to.eql(false);
            expect(await dlsiteStrategy.shouldUse('bVJ12')).to.eql(false);
            expect(await dlsiteStrategy.shouldUse('eRJ123456789')).to.eql(
                false
            );
            expect(await dlsiteStrategy.shouldUse('somethingElse')).to.eql(
                false
            );
            expect(await dlsiteStrategy.shouldUse('123456')).to.eql(false);
            expect(await dlsiteStrategy.shouldUse('v123456')).to.eql(false);
            expect(await dlsiteStrategy.shouldUse('other123456')).to.eql(false);
        });
    });

    describe('score codes', () => {
        it('returns empty array when there are no matches', () => {
            expect(
                dlsiteStrategy.scoreCodes(
                    {
                        extractedCode: '',
                        foundCodes: [],
                    },
                    'anything'
                )
            ).to.eql([]);
        });
    });
});
