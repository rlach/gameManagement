const sinon = require('sinon');
const { expect } = require('chai');
const fs = require('fs');
const request = require('request-promise');
const DmmStrategy = require('../../src/parsers/dmm');
const moment = require('moment');
const vndb = require('../../src/util/vndb');

describe('DMM strategy', function() {
    let dmmStrategy;
    beforeEach(async function() {
        const settings = {
            advanced: {
                scores: {},
            },
        };

        dmmStrategy = new DmmStrategy(settings);
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', function() {
        it('returns empty object when source is marked as missing', async function() {
            expect(
                await dmmStrategy.fetchGameData('anything', {
                    sourceMissingJp: true,
                })
            ).to.eql({});
        });

        it('returns empty object when page request throws', async function() {
            sinon.stub(request, 'get').throws('anything');
            expect(await dmmStrategy.fetchGameData('anything')).to.eql({});
        });

        it('marks source as missing when page request throws 404', async function() {
            sinon.stub(request, 'get').throws({
                statusCode: 404,
            });
            expect(await dmmStrategy.fetchGameData('anything')).to.eql({
                sourceMissingJp: true,
            });
        });

        describe('pro site', function() {
            it('returns parsed data when response is proper', async function() {
                sinon.stub(vndb, 'getVNByName').resolves(undefined);

                const site = fs.readFileSync(
                    './test/parsers/sites/dmm-pro.html'
                );
                sinon.stub(request, 'get').resolves(site);

                expect(await dmmStrategy.fetchGameData('next_12345')).to.eql({
                    additionalImages: [
                        'https://dmm.com/s-001.jpg',
                        'https://dmm.com/s-002.jpg',
                    ],
                    communityStarVotes: 9,
                    communityStars: 4.33,
                    descriptionJp: 'Description',
                    genresJp: ['Genre 1', 'Genre 2'],
                    imageUrlJp: 'https://dmm.com/package.jpg',
                    makerJp: 'Game maker',
                    nameJp: '素晴らしいゲーム',
                    releaseDate: moment('2016-10-28', 'YYYY-MM-DD').format(),
                    series: 'Series name',
                    tagsJp: ['Tag 1'],
                });
            });

            it('returns empty object when page misses data', async function() {
                sinon.stub(request, 'get').resolves('<html></html>');
                expect(await dmmStrategy.fetchGameData('next_12345')).to.eql(
                    {}
                );
            });
        });

        describe('doujin site', function() {
            it('returns parsed data when response is proper', async function() {
                sinon.stub(vndb, 'getVNByName').resolves(undefined);

                const site = fs.readFileSync(
                    './test/parsers/sites/dmm-doujin.html'
                );
                sinon.stub(request, 'get').resolves(site);

                expect(await dmmStrategy.fetchGameData('d_12345')).to.eql({
                    additionalImages: [
                        'https://doujin.com/sample1.jpg',
                        'https://doujin.com/sample2.jpg',
                    ],
                    communityStarVotes: 2,
                    communityStars: 3.5,
                    descriptionJp: 'Description',
                    genresJp: ['Genre 1', 'Genre 2'],
                    imageUrlJp: 'https://doujin.com/package.jpg',
                    makerJp: 'Game maker',
                    nameJp: '素晴らしいゲーム',
                    releaseDate: moment(
                        '2012-04-01 10',
                        'YYYY-MM-DD hh'
                    ).format(),
                    series: 'Series',
                    tagsJp: ['The only tag'],
                });
            });

            it('returns empty object when page misses data', async function() {
                sinon.stub(request, 'get').resolves('<html></html>');
                expect(await dmmStrategy.fetchGameData('d_12345')).to.eql({});
            });
        });

        describe('mono site', function() {
            it('returns parsed data when response is proper', async function() {
                sinon.stub(vndb, 'getVNByName').resolves(undefined);

                const site = fs.readFileSync(
                    './test/parsers/sites/dmm-mono.html'
                );
                sinon.stub(request, 'get').resolves(site);

                expect(
                    await dmmStrategy.fetchGameData('d_something12345')
                ).to.eql({
                    additionalImages: [
                        'https://dmm.com/s-001.jpg',
                        'https://dmm.com/s-002.jpg',
                    ],
                    communityStarVotes: 1,
                    communityStars: 5,
                    descriptionJp: 'Description',
                    genresJp: ['Genre 1', 'Genre 2'],
                    imageUrlJp: 'https://dmm.com/package.jpg',
                    makerJp: 'Greatest maker',
                    nameJp: '素晴らしいゲーム',
                    releaseDate: moment('2012-11-16', 'YYYY-MM-DD').format(),
                    tagsJp: ['Tag 1', 'Tag 2'],
                });
            });

            it('returns empty object when page misses data', async function() {
                sinon.stub(request, 'get').resolves('<html></html>');
                expect(
                    await dmmStrategy.fetchGameData('d_something12345')
                ).to.eql({});
            });
        });
    });
});
