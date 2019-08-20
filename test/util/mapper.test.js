const sinon = require('sinon');
const { expect } = require('chai');
const Mapper = require('../../src/util/mapper');
const moment = require('moment');

describe('files.js', async () => {
    const xmlKeyList = [
        'ApplicationPath',
        'Broken',
        'CommunityStarRating',
        'CommunityStarRatingTotalVotes',
        'Completed',
        'DateAdded',
        'DateModified',
        'Developer',
        'Favorite',
        'Genre',
        'Hide',
        'ID',
        'LastPlayedDate',
        'Notes',
        'Platform',
        'PlayCount',
        'Portable',
        'Rating',
        'ReleaseDate',
        'RootFolder',
        'Series',
        'SortTitle',
        'Source',
        'StarRating',
        'StarRatingFloat',
        'Status',
        'Title',
        'Version',
    ];

    describe('json to xml', async () => {
        it('Maps empty object with default and empty values', async () => {
            const mapper = new Mapper('PLATFORM', 'CustomField', 'en');
            const mappedValues = mapper.map({});

            expect(mappedValues).to.have.keys(xmlKeyList);

            expect(mappedValues.Completed._text).to.eql('false'); //Boolean property
            expect(mappedValues.Version).to.eql({}); //Simple property
            expect(mappedValues.Rating._text).to.eql(0); //Integer property
            expect(mappedValues.StarRatingFloat._text).to.eql(0); //Float property
            expect(mappedValues.LastPlayedDate._text).to.eql(
                moment('1800-01-01', 'YYYY-MM-DD').format()
            ); //Date property

            //Special one directional mappings
            expect(mappedValues.StarRating._text).to.eql(0);
            expect(mappedValues.Platform._text).to.eql('PLATFORM');

            //Language dependent
            expect(mappedValues.Title._text).to.eql('');
            expect(mappedValues.Genre._text).to.eql('');

            //External ID
            expect(mappedValues.Status).to.eql({});
            expect(mappedValues.Source).to.eql({});
            expect(mappedValues.SortTitle).to.eql({});
        });

        describe('External Id', () => {
            it('maps external id to Status if set so', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    status: 'status',
                    id: 'id',
                    source: 'source',
                    sortName: 'sortName',
                });

                expect(mappedValues.Status._text).to.eql('id');
                expect(mappedValues.Source._text).to.eql('source');
                expect(mappedValues.SortTitle._text).to.eql('sortName');
            });

            it('maps external id to SortTitle if set so', async () => {
                const mapper = new Mapper('PLATFORM', 'SortTitle', 'en');
                const mappedValues = mapper.map({
                    status: 'status',
                    id: 'id',
                    source: 'source',
                    sortName: 'sortName',
                });

                expect(mappedValues.Status._text).to.eql('status');
                expect(mappedValues.Source._text).to.eql('source');
                expect(mappedValues.SortTitle._text).to.eql('id');
            });

            it('maps external id to Source if set so', async () => {
                const mapper = new Mapper('PLATFORM', 'Source', 'en');
                const mappedValues = mapper.map({
                    status: 'status',
                    id: 'id',
                    source: 'source',
                    sortName: 'sortName',
                });

                expect(mappedValues.Status._text).to.eql('status');
                expect(mappedValues.Source._text).to.eql('id');
                expect(mappedValues.SortTitle._text).to.eql('sortName');
            });

            it('does not map id to anything if set as CustomField', async () => {
                const mapper = new Mapper('PLATFORM', 'CustomField', 'en');
                const mappedValues = mapper.map({
                    status: 'status',
                    id: 'id',
                    source: 'source',
                    sortName: 'sortName',
                });

                expect(mappedValues.Status._text).to.eql('status');
                expect(mappedValues.Source._text).to.eql('source');
                expect(mappedValues.SortTitle._text).to.eql('sortName');
            });

            it('does not map id to anything if externalId not set to anything', async () => {
                const mapper = new Mapper('PLATFORM', undefined, 'en');
                const mappedValues = mapper.map({
                    status: 'status',
                    id: 'id',
                    source: 'source',
                    sortName: 'sortName',
                });

                expect(mappedValues.Status._text).to.eql('status');
                expect(mappedValues.Source._text).to.eql('source');
                expect(mappedValues.SortTitle._text).to.eql('sortName');
            });
        });

        describe('Language dependent values', () => {
            describe('simple proprerty', () => {
                it('maps simple property from japanese if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({
                        nameJp: 'japanese',
                        nameEn: 'english',
                    });

                    expect(mappedValues.Title._text).to.eql('japanese');
                });

                it('maps simple property from english if set to japanese but only english exists', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({ nameEn: 'english' });

                    expect(mappedValues.Title._text).to.eql('english');
                });

                it('maps simple property from english if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'en');
                    const mappedValues = mapper.map({
                        nameJp: 'japanese',
                        nameEn: 'english',
                    });

                    expect(mappedValues.Title._text).to.eql('english');
                });

                it('maps simple property from japanese if set to english but only japanese exists', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({ nameJp: 'japanese' });

                    expect(mappedValues.Title._text).to.eql('japanese');
                });

                it('maps simple property from english by default', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', undefined);
                    const mappedValues = mapper.map({
                        nameJp: 'japanese',
                        nameEn: 'english',
                    });

                    expect(mappedValues.Title._text).to.eql('english');
                });
            });

            describe('array property', () => {
                it('maps array property from japanese if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({
                        genresJp: ['japanese', 'japanese2'],
                        genresEn: ['english', 'english2'],
                    });

                    expect(mappedValues.Genre._text).to.eql(
                        'japanese;japanese2'
                    );
                });

                it('maps array property from english if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'en');
                    const mappedValues = mapper.map({
                        genresJp: ['japanese', 'japanese2'],
                        genresEn: ['english', 'english2'],
                    });

                    expect(mappedValues.Genre._text).to.eql('english;english2');
                });

                it('maps array property from english by default', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', undefined);
                    const mappedValues = mapper.map({
                        genresJp: ['japanese', 'japanese2'],
                        genresEn: ['english', 'english2'],
                    });

                    expect(mappedValues.Genre._text).to.eql('english;english2');
                });

                it('maps array property from english if set to japanese but only english exists', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({
                        genresEn: ['english', 'english2'],
                    });

                    expect(mappedValues.Genre._text).to.eql('english;english2');
                });

                it('maps array property from english if set to japanese but only english has entries', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'jp');
                    const mappedValues = mapper.map({
                        genresJp: [],
                        genresEn: ['english', 'english2'],
                    });

                    expect(mappedValues.Genre._text).to.eql('english;english2');
                });

                it('maps array property from japanese if set to english but only japanese exists', async () => {
                    const mapper = new Mapper('PLATFORM', 'Status', 'en');
                    const mappedValues = mapper.map({
                        genresJp: ['japanese', 'japanese2'],
                    });

                    expect(mappedValues.Genre._text).to.eql(
                        'japanese;japanese2'
                    );
                });
            });
        });

        describe('Integer property', () => {
            it('maps number with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    rating: 5,
                });

                expect(mappedValues.Rating._text).to.eql(5);
            });

            it('maps floors float value', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    rating: 5.5,
                });

                expect(mappedValues.Rating._text).to.eql(5);
            });

            it('maps missing number to 0', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.Rating._text).to.eql(0);
            });
        });

        describe('Float property', () => {
            it('maps float with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    stars: 5.5,
                });

                expect(mappedValues.StarRatingFloat._text).to.eql(5.5);
            });

            it('maps missing value to 0', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.StarRatingFloat._text).to.eql(0);
            });
        });

        describe('Date property', () => {
            it('maps date with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const date = '2019-03-04';
                const mappedValues = mapper.map({
                    releaseDate: date,
                });

                expect(mappedValues.ReleaseDate._text).to.eql(date);
            });

            it('maps date to now by default', async () => {
                this.clock = date => sinon.useFakeTimers(new Date(date));
                this.clock('2019-07-07');

                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.ReleaseDate._text).to.eql(
                    moment().format()
                );
            });

            it('maps date to default time if set', async () => {
                this.clock = date => sinon.useFakeTimers(new Date(date));
                this.clock('2019-07-07');

                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.LastPlayedDate._text).to.eql(
                    moment('1800-01-01', 'YYYY-MM-DD').format()
                );
            });
        });

        describe('Boolean property', () => {
            it('maps boolean as string', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    favorite: true,
                });

                expect(mappedValues.Favorite._text).to.eql('true');
            });

            it('maps boolean to false by default', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.Favorite._text).to.eql('false');
            });
        });

        describe('One way mappings', () => {
            it('maps star rating to floored value as well', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({
                    stars: 5.5,
                });

                expect(mappedValues.StarRating._text).to.eql(5);
            });

            it('maps star rating to 0 by default', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.StarRating._text).to.eql(0);
            });

            it('maps platform based on mapper parameter', async () => {
                const mapper = new Mapper('PLATFORM', 'Status', 'en');
                const mappedValues = mapper.map({});

                expect(mappedValues.Platform._text).to.eql('PLATFORM');
            });
        });
    });

    describe('xml to json', async () => {
        it('Maps empty object to empty object', async () => {
            const mapper = new Mapper('PLATFORM', 'customField', 'en');
            expect(mapper.reverseMap({})).to.eql({});
        });

        describe('Language dependent values', () => {
            describe('Simple property', () => {
                it('Maps text to english if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'en');
                    const result = mapper.reverseMap({
                        Title: {
                            _text: 'title',
                        },
                    });
                    expect(result.nameEn).to.eql('title');
                    expect(result.nameJp).to.eql(undefined);
                });

                it('Maps text to japanese if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'jp');
                    const result = mapper.reverseMap({
                        Title: {
                            _text: 'title',
                        },
                    });
                    expect(result.nameJp).to.eql('title');
                    expect(result.nameEn).to.eql(undefined);
                });

                it('Maps text to english by default', async () => {
                    const mapper = new Mapper(
                        'PLATFORM',
                        'customField',
                        undefined
                    );
                    const result = mapper.reverseMap({
                        Title: {
                            _text: 'title',
                        },
                    });
                    expect(result.nameEn).to.eql('title');
                    expect(result.nameJp).to.eql(undefined);
                });

                it('Does not map to anything if there is no input value', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'en');
                    const result = mapper.reverseMap({});
                    expect(result.nameJp).to.eql(undefined);
                    expect(result.nameEn).to.eql(undefined);
                });
            });

            describe('Array property', () => {
                it('Maps text to english array if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'en');
                    const result = mapper.reverseMap({
                        Genre: {
                            _text: 'genre1;genre2',
                        },
                    });
                    expect(result.genresEn).to.eql(['genre1', 'genre2']);
                    expect(result.genresJp).to.eql(undefined);
                });

                it('Maps text to empty array if text is undefined', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'en');
                    const result = mapper.reverseMap({
                        Genre: {
                            _text: undefined,
                        },
                    });
                    expect(result.genresEn).to.eql([]);
                    expect(result.genresJp).to.eql(undefined);
                });

                it('Maps text to japanese array if set so', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'jp');
                    const result = mapper.reverseMap({
                        Genre: {
                            _text: 'genre1;genre2',
                        },
                    });
                    expect(result.genresJp).to.eql(['genre1', 'genre2']);
                    expect(result.genresEn).to.eql(undefined);
                });

                it('Maps text to english array by default', async () => {
                    const mapper = new Mapper(
                        'PLATFORM',
                        'customField',
                        undefined
                    );
                    const result = mapper.reverseMap({
                        Genre: {
                            _text: 'genre1;genre2',
                        },
                    });
                    expect(result.genresEn).to.eql(['genre1', 'genre2']);
                    expect(result.genresJp).to.eql(undefined);
                });

                it('Does not map to anything if there is no input value', async () => {
                    const mapper = new Mapper('PLATFORM', 'customField', 'en');
                    const result = mapper.reverseMap({});
                    expect(result.genresEn).to.eql(undefined);
                    expect(result.genresJp).to.eql(undefined);
                });
            });
        });

        describe('Boolean property', () => {
            it('Maps boolean string to boolean value', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({
                    Favorite: {
                        _text: 'true',
                    },
                });
                expect(result.favorite).to.eql(true);
            });

            it('Does not map to anything by default', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({});
                expect(result.favorite).to.eql(undefined);
            });
        });

        describe('Date property', () => {
            it('Maps date with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({
                    ReleaseDate: {
                        _text: '2019-07-03',
                    },
                });
                expect(result.releaseDate).to.eql('2019-07-03');
            });

            it('Does not map to anything by default', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({});
                expect(result.releaseDate).to.eql(undefined);
            });
        });

        describe('Integer property', () => {
            it('Maps integer with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({
                    Rating: {
                        _text: '5',
                    },
                });
                expect(result.rating).to.eql(5);
            });

            it('Does not map to anything by default', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({});
                expect(result.rating).to.eql(undefined);
            });
        });

        describe('Float property', () => {
            it('Maps float with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({
                    StarRatingFloat: {
                        _text: '5.5',
                    },
                });
                expect(result.stars).to.eql(5.5);
            });

            it('Does not map to anything by default', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({});
                expect(result.rating).to.eql(undefined);
            });
        });

        describe('Simple property', () => {
            it('Maps text with no change', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({
                    Series: {
                        _text: '5.5 text',
                    },
                });
                expect(result.series).to.eql('5.5 text');
            });

            it('Does not map to anything by default', async () => {
                const mapper = new Mapper('PLATFORM', 'customField', 'en');
                const result = mapper.reverseMap({});
                expect(result.series).to.eql(undefined);
            });
        });
    });
});
