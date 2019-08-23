const sinon = require('sinon');
const iconv = require('iconv-lite');
const moment = require('moment');
const vndb = require('../../src/util/vndb');
const { expect } = require('chai');
const fs = require('fs');
const request = require('request-promise');
const GetchuStrategy = require('../../src/parsers/getchu');

describe('Getchu strategy', function() {
    let japaneseParseResult;

    let getchuStrategy;
    beforeEach(async function() {
        japaneseParseResult = {
            additionalImages: [
                'http://getchu.com/sample1.jpg',
                'http://getchu.com/sample2.jpg',
            ],
            descriptionJp: '今日の散歩は大成功でした。',
            imageUrlJp: 'http://getchu.com/package.jpg',
            makerJp: 'ゲームの作成者',
            nameJp: '素晴らしいゲーム',
            releaseDate: moment('2019-04-26', 'YYYY-MM-DD').format(),
        };

        const settings = {
            advanced: {
                scores: {},
            },
        };

        getchuStrategy = new GetchuStrategy(settings);
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', function() {
        it('returns empty object when source is set as missing', async function() {
            expect(
                await getchuStrategy.fetchGameData('123456', {
                    sourceMissingJp: true,
                })
            ).to.eql({});
        });

        it('marks source as missing when getchu returns empty page', async function() {
            sinon.stub(request, 'get').resolves('');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                sourceMissingJp: true,
            });
        });

        it('returns empty object when could not get data from html', async function() {
            sinon
                .stub(request, 'get')
                .resolves('<!DOCTYPE html><html lang="en"></html>');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({});
        });

        it('returns empty object when request fails', async function() {
            sinon.stub(request, 'get').rejects(new Error('foobar'));

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({});
        });

        it('returns japanese data when site returned proper page and vndb returned nothing', async function() {
            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(mockEncodedSite('./test/parsers/sites/getchu.html'));
            sinon.stub(vndb, 'getVNByName');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                ...japaneseParseResult,
            });
        });

        it('merges japanese and english data when vndb returned', async function() {
            const vndbData = {
                nameEn: 'vndbTitle',
                releaseDate: '1901-01-01T00:00:00+02:00',
                descriptionEn: 'vndbDescription',
                genresEn: ['vndbGenre', 'vndbGenre 2'],
                tagsEn: ['vndbTag', 'vndbTag 2'],
                imageUrlEn: 'https://vndb.com/image.jpg',
                additionalImages: [
                    'https://vndb.com/additional1.jpg',
                    'https://vndb.com/additional2.jpg',
                ],
                communityStarVotes: 1234,
                communityStars: 3.5,
            };

            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(mockEncodedSite('./test/parsers/sites/getchu.html'));
            sinon.stub(vndb, 'getVNByName').resolves(vndbData);

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                ...japaneseParseResult,
                ...vndbData,
            });
        });

        describe('rating score', function() {
            it('returns score average if reviews are available', async function() {
                sinon
                    .stub(request, 'get')
                    .onFirstCall()
                    .resolves(
                        mockEncodedSite('./test/parsers/sites/getchu.html')
                    )
                    .onSecondCall()
                    .resolves(
                        mockEncodedSite(
                            './test/parsers/sites/getchu-reviews.html'
                        )
                    );
                sinon.stub(vndb, 'getVNByName');

                expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                    ...japaneseParseResult,
                    communityStars: 4,
                });
            });

            it('returns score of 0 if reviews are not available', async function() {
                sinon
                    .stub(request, 'get')
                    .onFirstCall()
                    .resolves(
                        mockEncodedSite('./test/parsers/sites/getchu.html')
                    )
                    .onSecondCall()
                    .resolves('<html></html>');
                sinon.stub(vndb, 'getVNByName');

                expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                    ...japaneseParseResult,
                    communityStars: 0,
                });
            });
        });
    });

    describe('find game', function() {
        it('returns codes for games found in search results', async function() {
            sinon
                .stub(request, 'get')
                .resolves(
                    mockEncodedSite('./test/parsers/sites/getchu-search.html')
                );

            expect(await getchuStrategy.findGame('cool game')).to.eql([
                {
                    work_name: 'クールなゲーム',
                    workno: '123456',
                },
                {
                    work_name: '素晴らしいゲーム',
                    workno: '678901',
                },
            ]);
        });

        it('returns empty array when there are no search results', async function() {
            sinon.stub(request, 'get').resolves('<html></html>');

            expect(await getchuStrategy.findGame('cool game')).to.eql([]);
        });
    });

    describe('get additional images', function() {
        it('returns images when getchu returned some', async function() {
            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(mockEncodedSite('./test/parsers/sites/getchu.html'));
            sinon.stub(vndb, 'getVNByName');

            expect(await getchuStrategy.getAdditionalImages('123456')).to.eql(
                japaneseParseResult.additionalImages
            );
        });

        it('returns undefined when site had no image samples', async function() {
            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves('<html></html>');
            sinon.stub(vndb, 'getVNByName');

            expect(await getchuStrategy.getAdditionalImages('123456')).to.eql(
                undefined
            );
        });
    });

    describe('should use', function() {
        it('returns true when code is just a number between 6 and 8 digits long', async function() {
            expect(getchuStrategy.shouldUse('123456')).to.eql(true);
            expect(getchuStrategy.shouldUse('1234567')).to.eql(true);
            expect(getchuStrategy.shouldUse('12308978')).to.eql(true);
        });

        it('returns false when code is just a too long or too short number', async function() {
            expect(getchuStrategy.shouldUse('12345')).to.eql(false);
            expect(getchuStrategy.shouldUse('123089789')).to.eql(false);
        });

        it('returns false when code contains other characters', async function() {
            expect(getchuStrategy.shouldUse('RJ123456')).to.eql(false);
            expect(getchuStrategy.shouldUse('VJ123456')).to.eql(false);
            expect(getchuStrategy.shouldUse('RE123456')).to.eql(false);
            expect(getchuStrategy.shouldUse('v123456')).to.eql(false);
            expect(getchuStrategy.shouldUse('next_123456')).to.eql(false);
            expect(getchuStrategy.shouldUse('other123456')).to.eql(false);
        });
    });

    describe('extract code', function() {
        it('returns 6-8 character long number from strings', async function() {
            expect(getchuStrategy.extractCode('123456')).to.eql('123456');
            expect(getchuStrategy.extractCode('Yorozuya [123456]')).to.eql(
                '123456'
            );
            expect(getchuStrategy.extractCode('[123456] Yorozuya')).to.eql(
                '123456'
            );
            expect(getchuStrategy.extractCode('(123456) Yorozuya')).to.eql(
                '123456'
            );
            expect(getchuStrategy.extractCode('(RJ123456) Yorozuya')).to.eql(
                '123456'
            );
            expect(getchuStrategy.extractCode('(VJ123456) Yorozuya')).to.eql(
                '123456'
            );
            expect(getchuStrategy.extractCode('(v123456) Yorozuya')).to.eql(
                '123456'
            );
        });

        it('ignores numbers that are too short', async function() {
            expect(getchuStrategy.extractCode('23456')).to.eql('');
            expect(getchuStrategy.extractCode('Yorozuya [23456]')).to.eql('');
            expect(getchuStrategy.extractCode('[12345] Yorozuya')).to.eql('');
            expect(getchuStrategy.extractCode('(12345) Yorozuya')).to.eql('');
            expect(getchuStrategy.extractCode('(RJ12356) Yorozuya')).to.eql('');
            expect(getchuStrategy.extractCode('(VJ12356) Yorozuya')).to.eql('');
            expect(getchuStrategy.extractCode('(v12346) Yorozuya')).to.eql('');
        });

        it('ignores numbers that are too long', async function() {
            expect(getchuStrategy.extractCode('122345687')).to.eql('');
            expect(getchuStrategy.extractCode('Yorozuya [244345634]')).to.eql(
                ''
            );
            expect(getchuStrategy.extractCode('[123455523] Yorozuya')).to.eql(
                ''
            );
            expect(getchuStrategy.extractCode('(123466542) Yorozuya')).to.eql(
                ''
            );
            expect(getchuStrategy.extractCode('(RJ124435642) Yorozuya')).to.eql(
                ''
            );
            expect(getchuStrategy.extractCode('(VJ123555642) Yorozuya')).to.eql(
                ''
            );
            expect(
                getchuStrategy.extractCode('(v1234346124214) Yorozuya')
            ).to.eql('');
        });
    });
});

function mockEncodedSite(path) {
    const site = fs.readFileSync(path).toString();
    return iconv.encode(site, 'EUC-JP');
}
