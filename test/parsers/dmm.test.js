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
            organizeDirectories: {
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

    describe('find game', function() {
        it('returns empty array when both sources returned no codes', async function() {
            sinon.stub(request, 'get');

            const result = await dmmStrategy.findGame('title');
            expect(result).to.eql([]);
        });

        it('returns results from doujin when only it returned results', async function() {
            const doujinSearch = fs
                .readFileSync('./test/parsers/sites/dmm-doujin-search.html')
                .toString();

            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(doujinSearch);

            const result = await dmmStrategy.findGame('title');
            expect(result).to.eql([
                {
                    workno: 'd_12345',
                    work_name: 'Title',
                },
            ]);
        });

        it('returns results from pro when only it returned results', async function() {
            const doujinSearch = fs
                .readFileSync('./test/parsers/sites/dmm-doujin-search.html')
                .toString();

            const proSearch = fs
                .readFileSync('./test/parsers/sites/dmm-pro-search.html')
                .toString();

            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(doujinSearch)
                .onSecondCall()
                .resolves(proSearch);

            const result = await dmmStrategy.findGame('title');
            expect(result).to.eql([
                {
                    workno: 'd_12345',
                    work_name: 'Title',
                },
                {
                    workno: 'hobc_0199',
                    work_name: 'Title Pro',
                },
            ]);
        });

        it('returns results from both sites when they returned results', async function() {
            const proSearch = fs
                .readFileSync('./test/parsers/sites/dmm-pro-search.html')
                .toString();

            sinon
                .stub(request, 'get')
                .onSecondCall()
                .resolves(proSearch);

            const result = await dmmStrategy.findGame('title');
            expect(result).to.eql([
                {
                    workno: 'hobc_0199',
                    work_name: 'Title Pro',
                },
            ]);
        });
    });

    describe('extract code', function() {
        it('extracts d_ codes', async function() {
            expect(dmmStrategy.extractCode('what [d_1]')).to.eql('d_1');
            expect(dmmStrategy.extractCode('foo (d_1234)')).to.eql('d_1234');
            expect(dmmStrategy.extractCode('d_1234567 foobar')).to.eql(
                'd_1234567'
            );
        });

        it('extracts d_word codes', async function() {
            expect(
                dmmStrategy.extractCode('very d_something1 hard to find')
            ).to.eql('d_something1');
            expect(dmmStrategy.extractCode('!d_foo1234mon')).to.eql(
                'd_foo1234'
            );
            expect(dmmStrategy.extractCode('test d_bar1234567 test')).to.eql(
                'd_bar1234567'
            );
        });

        it('extracts word_ codes', async function() {
            expect(dmmStrategy.extractCode('[next_1] next')).to.eql('next_1');
            expect(dmmStrategy.extractCode('(company) foo_1234')).to.eql(
                'foo_1234'
            );
            expect(dmmStrategy.extractCode('bar bar_1234567 bar')).to.eql(
                'bar_1234567'
            );
        });

        it('fails on codes related to other games', async function() {
            expect(dmmStrategy.extractCode('other1')).to.eql('');
            expect(dmmStrategy.extractCode('v1')).to.eql('');
            expect(dmmStrategy.extractCode('RJ123456')).to.eql('');
            expect(dmmStrategy.extractCode('RE123456')).to.eql('');
            expect(dmmStrategy.extractCode('VJ123456')).to.eql('');
            expect(dmmStrategy.extractCode('123456')).to.eql('');
        });
    });

    describe('should use', function() {
        it('matches d_ codes', async function() {
            expect(dmmStrategy.shouldUse('d_1')).to.eql(true);
            expect(dmmStrategy.shouldUse('d_1234')).to.eql(true);
            expect(dmmStrategy.shouldUse('d_1234567')).to.eql(true);
        });

        it('matches d_word codes', async function() {
            expect(dmmStrategy.shouldUse('d_something1')).to.eql(true);
            expect(dmmStrategy.shouldUse('d_foo1234')).to.eql(true);
            expect(dmmStrategy.shouldUse('d_bar1234567')).to.eql(true);
        });

        it('matches word_codes', async function() {
            expect(dmmStrategy.shouldUse('next_1')).to.eql(true);
            expect(dmmStrategy.shouldUse('foo_1234')).to.eql(true);
            expect(dmmStrategy.shouldUse('bar_1234567')).to.eql(true);
        });

        it('rejects on codes related to other games', async function() {
            expect(dmmStrategy.shouldUse('other1')).to.eql(false);
            expect(dmmStrategy.shouldUse('v1')).to.eql(false);
            expect(dmmStrategy.shouldUse('RJ123456')).to.eql(false);
            expect(dmmStrategy.shouldUse('RE123456')).to.eql(false);
            expect(dmmStrategy.shouldUse('VJ123456')).to.eql(false);
            expect(dmmStrategy.shouldUse('123456')).to.eql(false);
        });
    });

    it('returns additional images from getSite', async function() {
        sinon.stub(dmmStrategy, 'getSite').returns({
            additionalImages: ['a1', 'a2'],
        });
        const result = await dmmStrategy.getAdditionalImages('d_12345');
        expect(result).to.eql(['a1', 'a2']);
    });
});
