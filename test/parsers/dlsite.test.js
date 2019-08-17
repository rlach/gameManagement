const sinon = require('sinon');
const Chai = require('chai');
const { expect } = Chai;
const ChaiPromised = require('chai-as-promised');
const request = require('request-promise');
const dlsiteStrategy = require('../../src/parsers/dlsite');
const fs = require('fs');
const vndb = require('../../src/util/vndb');
const moment = require('moment');

Chai.use(ChaiPromised);

describe('Dlsite strategy', function() {
    const dlsiteParseResultEn = {
        genresEn: ['Genre 1', 'Genre 2'],
        imageUrlEn: 'http://anything.com/main.jpg',
        makerEn: 'Game maker',
        nameEn: 'Game name',
        descriptionEn: 'description',
        series: 'series name',
        releaseDate: moment('2019-07-04', 'YYYY-MM-DD').format(),
        tagsEn: ['Tag', 'Tag 2'],
    };

    const dlsiteParseResultJp = {
        genresJp: ['Genre 1', 'Genre 2'],
        imageUrlJp: 'http://anything.com/main.jpg',
        makerJp: 'Game maker',
        nameJp: 'Game name',
        descriptionJp: 'description',
        series: 'series name',
        releaseDate: moment('2019-07-04', 'YYYY-MM-DD').format(),
        tagsJp: ['Tag', 'Tag 2'],
    };

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    describe('fetch game data', () => {
        it('returns undefined when using from code for strategy', async () => {
            expect(await dlsiteStrategy.fetchGameData('anything')).to.eql({});
        });

        describe('source missing', () => {
            it('returns undefined if english source was marked as missing in database and code stars from RE', async () => {
                expect(
                    await dlsiteStrategy.fetchGameData('RE249908', {
                        sourceMissingEn: true,
                    })
                ).to.eql({});
            });

            it('returns undefined if japanese source was marked as missing in database and code stars from VJ', async () => {
                expect(
                    await dlsiteStrategy.fetchGameData('VJ249908', {
                        sourceMissingJp: true,
                    })
                ).to.eql({});
            });

            it('returns undefined if both sources were marked as missing in database and code stars from RJ', async () => {
                expect(
                    await dlsiteStrategy.fetchGameData('RE249908', {
                        sourceMissingJp: true,
                        sourceMissingEn: true,
                    })
                ).to.eql({});
            });
        });

        describe('mark source as missing', () => {
            it('marks japanese source as missing when both VJ calls failed', async () => {
                const getStub = sinon.stub(request, 'get').throws({
                    statusCode: 404,
                });

                expect(
                    await dlsiteStrategy.fetchGameData('VJ249908', {})
                ).to.eql({
                    sourceMissingJp: true,
                });
                sinon.assert.calledTwice(getStub);
            });

            it('marks sources as missing when doujin sites fail', async () => {
                const getStub = sinon.stub(request, 'get').throws({
                    statusCode: 404,
                });

                expect(
                    await dlsiteStrategy.fetchGameData('RJ249908', {})
                ).to.eql({
                    sourceMissingJp: true,
                    sourceMissingEn: true,
                });
                sinon.assert.calledTwice(getStub);
            });
        });

        it('returns product info if game is found', async () => {
            const site = fs.readFileSync('./test/parsers/sites/dlsite.html');
            const getStub = sinon
                .stub(request, 'get')
                .onFirstCall()
                .returns(site)
                .onSecondCall()
                .returns(
                    JSON.stringify({
                        RE249908: {
                            rate_average_2dp: 3.5,
                            rate_count: 12345,
                        },
                    })
                );

            expect(await dlsiteStrategy.fetchGameData('RE249908', {})).to.eql({
                ...dlsiteParseResultEn,
                communityStarVotes: 12345,
                communityStars: 3.5,
            });
            sinon.assert.calledTwice(getStub);
        });

        describe('english sources(RE)', () => {
            it('returns parsed site', async () => {
                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon.stub(request, 'get').returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('RE249908', {})
                ).to.eql(dlsiteParseResultEn);
            });
        });

        describe('japanese sources(RJ)', () => {
            it('returns japanese data when only japanese site returned', async () => {
                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon
                    .stub(request, 'get')
                    .onFirstCall()
                    .returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('RJ249908', {})
                ).to.eql(dlsiteParseResultJp);
            });

            it('returns english data when only english site returned', async () => {
                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon
                    .stub(request, 'get')
                    .onSecondCall()
                    .returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('RJ249908', {})
                ).to.eql(dlsiteParseResultEn);
            });

            it('returns merged data when both sites returned', async () => {
                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon.stub(request, 'get').returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('RJ249908', {})
                ).to.eql({
                    ...dlsiteParseResultJp,
                    ...dlsiteParseResultEn,
                });
            });
        });

        describe('pro sources(VJ)', () => {
            it('returns parsed site and calls vndb with found name', async () => {
                const getVndbDataStub = sinon
                    .stub(vndb, 'getVndbData')
                    .returns(undefined);

                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon.stub(request, 'get').returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('VJ249908', {})
                ).to.eql(dlsiteParseResultJp);
                sinon.assert.calledOnce(getVndbDataStub);
            });

            it('calls announce site if pro call failed', async () => {
                const getVndbDataStub = sinon
                    .stub(vndb, 'getVndbData')
                    .returns(undefined);

                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                const getStub = sinon
                    .stub(request, 'get')
                    .onFirstCall()
                    .throws({
                        statusCode: 404,
                    })
                    .onSecondCall()
                    .returns(site)
                    .onThirdCall()
                    .returns(
                        JSON.stringify({
                            VJ249908: {
                                rate_average_2dp: 3.5,
                                rate_count: 12345,
                            },
                        })
                    );

                expect(
                    await dlsiteStrategy.fetchGameData('VJ249908', {})
                ).to.eql({
                    ...dlsiteParseResultJp,
                    communityStarVotes: 12345,
                    communityStars: 3.5,
                });
                sinon.assert.calledOnce(getVndbDataStub);
                sinon.assert.calledThrice(getStub);
            });

            it('returns results from both sources when vndb returned data', async () => {
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

                const getVndbDataStub = sinon
                    .stub(vndb, 'getVndbData')
                    .returns(vndbData);

                const site = fs.readFileSync(
                    './test/parsers/sites/dlsite.html'
                );
                sinon.stub(request, 'get').returns(site);

                expect(
                    await dlsiteStrategy.fetchGameData('VJ249908', {})
                ).to.eql({
                    ...dlsiteParseResultJp,
                    ...vndbData,
                });
                sinon.assert.calledOnce(getVndbDataStub);
            });
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
