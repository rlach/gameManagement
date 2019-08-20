const VNDB = require('vndb');
const sinon = require('sinon');
const Chai = require('chai');
const ChaiPromised = require('chai-as-promised');
const { expect } = Chai;
const moment = require('moment');

Chai.use(ChaiPromised);

const vndb = require('../src/util/vndb');

describe('vndb.js', function() {
    const vnResponse = {
        num: 1,
        items: [
            {
                original: '素晴らしいゲーム',
                title: 'Amazing game',
                released: '1920-01-01',
                description: 'description',
                image: 'https://vndb.com/image.jpg',
                screens: [
                    {
                        image: 'https://vndb.com/screen1.jpg',
                    },
                    {
                        image: 'https://vndb.com/screen1.jpg',
                    },
                ],
                votecount: 1,
                rating: 10,
            },
        ],
    };

    let startStub;
    let writeStub;
    let endStub;
    beforeEach(async () => {
        writeStub = sinon.stub();
        endStub = sinon.stub();
        startStub = sinon.stub(VNDB, 'start').resolves({
            write: writeStub,
            end: endStub,
        });
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
        await vndb.disconnect();
    });

    describe('connect', () => {
        it('creates new instance and sends login message', async () => {
            await vndb.connect();
            sinon.assert.calledOnce(startStub);
            sinon.assert.calledWithExactly(
                writeStub,
                'login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}'
            );
        });

        it('does not create already existing instance', async () => {
            await vndb.connect();
            await vndb.connect();
            sinon.assert.calledOnce(startStub);
            sinon.assert.calledWithExactly(
                writeStub,
                'login {"protocol":1,"client":"pervyGameEnthusiastWithLongDataStrings","clientver":"0.0.1"}'
            );
        });
    });

    describe('disconnect', () => {
        it('does nothing when VNDB is not connected', async () => {
            await vndb.disconnect();
            sinon.assert.notCalled(endStub);
        });

        it('ends vndb connection when VNDB is connected', async () => {
            await vndb.connect();
            await vndb.disconnect();
            sinon.assert.calledOnce(endStub);
        });

        it('does not to anything when called second time', async () => {
            await vndb.connect();
            await vndb.disconnect();
            await vndb.disconnect();
            sinon.assert.calledOnce(endStub);
        });
    });

    describe('when connected', () => {
        beforeEach(async () => {
            await vndb.connect();
        });

        describe('get visual novel by id', () => {
            it('gets visual novel and producers by novel id', async () => {
                writeStub
                    .onSecondCall()
                    .resolves('results {}')
                    .onThirdCall()
                    .resolves('results {}');
                const result = await vndb.getVNById('12345');
                sinon.assert.calledThrice(writeStub);
                sinon.assert.calledWithExactly(
                    writeStub.secondCall,
                    'get vn basic,details,tags,screens,stats (id=12345)'
                );
                sinon.assert.calledWithExactly(
                    writeStub.thirdCall,
                    'get release basic,producers (vn=12345)'
                );
                expect(result).to.eql({});
            });

            it('returns visual novel data when it was resolved', async () => {
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(vnResponse)}`)
                    .onThirdCall()
                    .resolves('results {}');
                const result = await vndb.getVNById('12345');
                expect(result).to.eql({
                    additionalImages: [
                        'https://vndb.com/screen1.jpg',
                        'https://vndb.com/screen1.jpg',
                    ],
                    communityStarVotes: 1,
                    communityStars: 5,
                    descriptionEn: 'description',
                    genresEn: [],
                    imageUrlEn: 'https://vndb.com/image.jpg',
                    nameEn: 'Amazing game',
                    nameJp: '素晴らしいゲーム',
                    releaseDate: moment('1920-01-01', 'YYYY-MM-DD').format(),
                    tagsEn: [],
                });
            });

            describe('developer', () => {
                it('returns developer data when it is returned', async () => {
                    const releasesResponse = {
                        num: 1,
                        items: [
                            {
                                type: 'complete',
                                producers: [
                                    {
                                        developer: true,
                                        original: '素晴らしい会社',
                                        name: 'Amazing company',
                                    },
                                ],
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves('results {}')
                        .onThirdCall()
                        .resolves(
                            `results ${JSON.stringify(releasesResponse)}`
                        );
                    const result = await vndb.getVNById('12345');
                    expect(result).to.eql({
                        makerEn: 'Amazing company',
                        makerJp: '素晴らしい会社',
                    });
                });

                it('ignores releases that are not complete', async () => {
                    const releasesResponse = {
                        num: 1,
                        items: [
                            {
                                type: 'trial',
                                producers: [
                                    {
                                        developer: true,
                                        original: '素晴らしい会社',
                                        name: 'Amazing company',
                                    },
                                ],
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves('results {}')
                        .onThirdCall()
                        .resolves(
                            `results ${JSON.stringify(releasesResponse)}`
                        );
                    const result = await vndb.getVNById('12345');
                    expect(result).to.eql({});
                });

                it('ignores releases that do not list developer', async () => {
                    const releasesResponse = {
                        num: 1,
                        items: [
                            {
                                type: 'complete',
                                producers: [
                                    {
                                        developer: false,
                                        original: '素晴らしい会社',
                                        name: 'Amazing company',
                                    },
                                ],
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves('results {}')
                        .onThirdCall()
                        .resolves(
                            `results ${JSON.stringify(releasesResponse)}`
                        );
                    const result = await vndb.getVNById('12345');
                    expect(result).to.eql({});
                });
            });

            describe('tags', () => {
                it('returns tags when they are available and above threshold', async () => {
                    const tagApplicationLevel = 2; // Certainly applies
                    const tags = [
                        [214, tagApplicationLevel], // Nukige
                        [24, tagApplicationLevel], // Plot
                    ];

                    const vnRespnseWithTags = {
                        num: 1,
                        items: [
                            {
                                tags,
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves(
                            `results ${JSON.stringify(vnRespnseWithTags)}`
                        )
                        .onThirdCall()
                        .resolves('results {}');
                    const result = await vndb.getVNById('12345');
                    expect(result).to.deep.include({
                        genresEn: ['Nukige'],
                        tagsEn: ['Plot'],
                    });
                });

                it('ignores tags below threshold', async () => {
                    const tooLowTagApplicationLevel = 1; // Applies but is not apparent or minor
                    const tags = [
                        [214, tooLowTagApplicationLevel], // Nukige
                        [24, tooLowTagApplicationLevel], // Plot
                    ];

                    const vnRespnseWithTags = {
                        num: 1,
                        items: [
                            {
                                tags,
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves(
                            `results ${JSON.stringify(vnRespnseWithTags)}`
                        )
                        .onThirdCall()
                        .resolves('results {}');
                    const result = await vndb.getVNById('12345');
                    expect(result).to.deep.include({
                        genresEn: [],
                        tagsEn: [],
                    });
                });

                it('ignores tags not found in tags json', async () => {
                    const tagApplicationLevel = 2; // Certainly applies
                    const tags = [
                        [214123123, tagApplicationLevel], // Does not exist
                    ];

                    const vnRespnseWithTags = {
                        num: 1,
                        items: [
                            {
                                tags,
                            },
                        ],
                    };

                    writeStub
                        .onSecondCall()
                        .resolves(
                            `results ${JSON.stringify(vnRespnseWithTags)}`
                        )
                        .onThirdCall()
                        .resolves('results {}');
                    const result = await vndb.getVNById('12345');
                    expect(result).to.deep.include({
                        genresEn: [],
                        tagsEn: [],
                    });
                });
            });

            describe('error', () => {
                it('retries when first response is throttle error', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves(
                            'error { "id": "throttled", "fullwait": 0.01 }'
                        );
                    const result = await vndb.getVNById('12345');
                    sinon.assert.callCount(writeStub, 4);
                    sinon.assert.calledWithExactly(
                        writeStub.secondCall,
                        'get vn basic,details,tags,screens,stats (id=12345)'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.thirdCall,
                        'get vn basic,details,tags,screens,stats (id=12345)'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.getCall(3),
                        'get release basic,producers (vn=12345)'
                    );
                    expect(result).to.eql({});
                });

                it('retries only release call when throttle error happens on release call', async () => {
                    writeStub
                        .resolves('results {}')
                        .onThirdCall()
                        .resolves(
                            'error { "id": "throttled", "fullwait": 0.01 }'
                        );
                    const result = await vndb.getVNById('12345');
                    sinon.assert.callCount(writeStub, 4);
                    sinon.assert.calledWithExactly(
                        writeStub.secondCall,
                        'get vn basic,details,tags,screens,stats (id=12345)'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.thirdCall,
                        'get release basic,producers (vn=12345)'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.getCall(3),
                        'get release basic,producers (vn=12345)'
                    );
                    expect(result).to.eql({});
                });

                it('throws for other errors than throttle', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves('error { "id": "anything" }');

                    return expect(
                        vndb.getVNById('12345')
                    ).to.be.eventually.rejectedWith({ id: 'anything' });
                });
            });
        });

        describe('get visual novel by name', () => {
            it('undefined when visual novel is not found', async () => {
                writeStub.onSecondCall().resolves('results {}');

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.eql(undefined);
            });

            it('uses first response when there is no exact match for the name', async () => {
                const games = {
                    num: 2,
                    items: [
                        {
                            title: 'amshashing ghame',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'game of amazement',
                            original: '素晴らしいゲーム',
                        },
                    ],
                };
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(games)}`);

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.include({
                    nameEn: 'amshashing ghame',
                });
            });

            it('uses game with equal title when possible', async () => {
                const games = {
                    num: 2,
                    items: [
                        {
                            title: 'amshashing ghame',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'game of amazement',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'amazing game',
                            original: '素晴らしいゲーム',
                        },
                    ],
                };
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(games)}`);

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.include({
                    nameEn: 'amazing game',
                });
            });

            it('uses game with equal original title when possible', async () => {
                const games = {
                    num: 2,
                    items: [
                        {
                            title: 'amshashing ghame',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'game of amazement',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'best game ever',
                            original: 'amazing game',
                        },
                    ],
                };
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(games)}`);

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.include({
                    nameEn: 'best game ever',
                });
            });

            it('uses game with name containing the title searched when there is no exact match', async () => {
                const games = {
                    num: 2,
                    items: [
                        {
                            title: 'amshashing ghame',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'game of amazement',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'amazing game redux',
                            original: '素晴らしいゲーム',
                        },
                    ],
                };
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(games)}`);

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.include({
                    nameEn: 'amazing game redux',
                });
            });

            it('uses game with original name containing the title searched when there is no exact match', async () => {
                const games = {
                    num: 2,
                    items: [
                        {
                            title: 'amshashing ghame',
                            original: '素晴らしいゲーム',
                        },
                        {
                            title: 'game of amazement',
                            original: 'amazing game NEO',
                        },
                    ],
                };
                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(games)}`);

                const response = await vndb.getVNByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.include({
                    nameEn: 'game of amazement',
                });
            });

            describe('error', () => {
                it('retries when first response is throttle error', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves(
                            'error { "id": "throttled", "fullwait": 0.01 }'
                        );
                    const result = await vndb.getVNByName('amazing game');
                    sinon.assert.calledThrice(writeStub);
                    sinon.assert.calledWithExactly(
                        writeStub.secondCall,
                        'get vn basic,details,tags,screens,stats (search~"amazing game")'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.thirdCall,
                        'get vn basic,details,tags,screens,stats (search~"amazing game")'
                    );
                    expect(result).to.eql(undefined);
                });

                it('throws for other errors than throttle', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves('error { "id": "anything" }');

                    return expect(
                        vndb.getVNByName('amazing game')
                    ).to.be.eventually.rejectedWith({ id: 'anything' });
                });
            });
        });

        describe('find visual novels by name', () => {
            it('returns empty array when no visual novels are found', async () => {
                writeStub.onSecondCall().resolves('results {}');

                const response = await vndb.findVNsByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.eql([]);
            });

            it('returns game codes with names when some are found', async () => {
                const findResponse = {
                    num: 1,
                    items: [
                        {
                            title: 'Amazing game',
                            original: '素晴らしいゲーム',
                            id: 12345,
                        },
                    ],
                };

                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(findResponse)}`);

                const response = await vndb.findVNsByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.eql([
                    {
                        workno: 'v12345',
                        work_name: '素晴らしいゲーム',
                    },
                ]);
            });

            it('returns uses title when original is not available', async () => {
                const findResponse = {
                    num: 1,
                    items: [
                        {
                            title: 'Amazing game',
                            id: 12345,
                        },
                    ],
                };

                writeStub
                    .onSecondCall()
                    .resolves(`results ${JSON.stringify(findResponse)}`);

                const response = await vndb.findVNsByName('amazing game');
                sinon.assert.calledTwice(writeStub);
                expect(response).to.eql([
                    {
                        workno: 'v12345',
                        work_name: 'Amazing game',
                    },
                ]);
            });

            describe('error', () => {
                it('retries when response is throttle error', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves(
                            'error { "id": "throttled", "fullwait": 0.01 }'
                        );
                    const result = await vndb.findVNsByName('amazing game');
                    sinon.assert.calledThrice(writeStub);
                    sinon.assert.calledWithExactly(
                        writeStub.secondCall,
                        'get vn basic (search~"amazing game")'
                    );
                    sinon.assert.calledWithExactly(
                        writeStub.thirdCall,
                        'get vn basic (search~"amazing game")'
                    );
                    expect(result).to.eql([]);
                });

                it('throws for other errors than throttle', async () => {
                    writeStub
                        .resolves('results {}')
                        .onSecondCall()
                        .resolves('error { "id": "anything" }');

                    return expect(
                        vndb.findVNsByName('amazing game')
                    ).to.be.eventually.rejectedWith({ id: 'anything' });
                });
            });
        });
    });

    describe('when not connected', () => {
        it('throws when trying to find visual novels', async () => {
            expect(vndb.findVNsByName('name')).to.eventually.be.rejectedWith(
                'VNDB not connected'
            );
        });

        it('throws when trying to get visual novel by id', async () => {
            expect(vndb.getVNById('12345')).to.eventually.be.rejectedWith(
                'VNDB not connected'
            );
        });

        it('throws when trying to get visual novel by name', async () => {
            expect(vndb.getVNByName('name')).to.eventually.be.rejectedWith(
                'VNDB not connected'
            );
        });
    });
});
