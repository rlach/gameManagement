const { expect } = require('chai');
const files = require('../../src/util/files');

describe('files.js', function() {
    describe('removes tags and metadata', function() {
        it('should return unchanged string when there are no tags', async function() {
            expect(files.removeTagsAndMetadata('Simple name')).to.eql(
                'Simple name'
            );
        });

        it('should return trimmed string', async function() {
            expect(files.removeTagsAndMetadata(' Simple name\n')).to.eql(
                'Simple name'
            );
        });

        it('should return string without [] tags', async function() {
            expect(
                files.removeTagsAndMetadata('[ADV] Simple name [RPG]')
            ).to.eql('Simple name');
        });

        it('should return string without () tags', async function() {
            expect(
                files.removeTagsAndMetadata('(ADV) Simple name (RPG)')
            ).to.eql('Simple name');
        });

        it('should return string without japanese () tags', async function() {
            expect(
                files.removeTagsAndMetadata('（ADV） Simple name （RPG）')
            ).to.eql('Simple name');
        });

        it('should remove japanese dot ・', async function() {
            expect(files.removeTagsAndMetadata(' Simple ・ name ')).to.eql(
                'Simple name'
            );
        });

        it('should return string without versions', async function() {
            expect(files.removeTagsAndMetadata('Simple name ver.1.3.4')).to.eql(
                'Simple name'
            );
            expect(
                files.removeTagsAndMetadata('Simple name ver. good version')
            ).to.eql('Simple name');
        });

        it('should remove all tags at once', async function() {
            expect(
                files.removeTagsAndMetadata(
                    '\n\n\n\n  [tag] (other tag) Simple [surprise] name ver. 1'
                )
            ).to.eql('Simple name');
        });
    });
});
