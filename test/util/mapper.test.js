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
    });

    describe('xml to json', async () => {
        it('Maps empty object to empty object', async () => {
            const mapper = new Mapper('PLATFORM', 'customField', 'en');
            expect(mapper.reverseMap({})).to.eql({});
        });
    });
});
