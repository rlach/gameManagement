const sinon = require('sinon');
const iconv = require('iconv-lite');
const moment = require('moment');
const vndb = require('../../src/util/vndb');
const { expect } = require('chai');
const fs = require('fs');
const request = require('request-promise');
const getchuStrategy = require('../../src/parsers/getchu');

describe('Getchu strategy', function() {
    const japaneseParseResult = {
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

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', () => {
        it('returns empty object when source is set as missing', async () => {
            expect(
                await getchuStrategy.fetchGameData('123456', {
                    sourceMissingJp: true,
                })
            ).to.eql({});
        });

        it('marks source as missing when getchu returns empty page', async () => {
            sinon.stub(request, 'get').resolves('');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                sourceMissingJp: true,
            });
        });

        it('returns empty object when could not get data from html', async () => {
            sinon
                .stub(request, 'get')
                .resolves('<!DOCTYPE html><html lang="en"></html>');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({});
        });

        it('returns empty object when request fails', async () => {
            sinon.stub(request, 'get').rejects(new Error('foobar'));

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({});
        });

        it('returns japanese data when site returned proper page and vndb returned nothing', async () => {
            sinon
                .stub(request, 'get')
                .onFirstCall()
                .resolves(mockEncodedSite('./test/parsers/sites/getchu.html'));
            sinon.stub(vndb, 'getVndbData');

            expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                ...japaneseParseResult,
            });
        });

        describe('rating score', () => {
            it('returns score average if reviews are available', async () => {
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
                sinon.stub(vndb, 'getVndbData');

                expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                    ...japaneseParseResult,
                    communityStars: 4,
                });
            });

            it('returns score of 0 if reviews are not available', async () => {
                sinon
                    .stub(request, 'get')
                    .onFirstCall()
                    .resolves(
                        mockEncodedSite('./test/parsers/sites/getchu.html')
                    )
                    .onSecondCall()
                    .resolves('<html></html>');
                sinon.stub(vndb, 'getVndbData');

                expect(await getchuStrategy.fetchGameData('123456')).to.eql({
                    ...japaneseParseResult,
                    communityStars: 0,
                });
            });
        });
    });
});

function mockEncodedSite(path) {
    const site = fs.readFileSync(path).toString();
    return iconv.encode(site, 'EUC-JP');
}
