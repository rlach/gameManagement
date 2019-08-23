const sinon = require('sinon');
const { expect } = require('chai');
const files = require('../../src/util/files');
const fs = require('fs');

describe('files.js', function() {
    afterEach(async function() {
        sinon.verifyAndRestore();
    });

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

    describe('create missing directory', function() {
        let mkdirStub;
        beforeEach(async function() {
            mkdirStub = sinon.stub(fs, 'mkdirSync');
        });

        it('does nothing if directory exists', async function() {
            sinon.stub(fs, 'existsSync').returns(true);
            files.createMissingDirectory('test');
            sinon.assert.notCalled(mkdirStub);
        });

        it('creates requested directory if it does not exist', async function() {
            sinon.stub(fs, 'existsSync').returns(false);
            files.createMissingDirectory('test');
            sinon.assert.calledWithExactly(mkdirStub, 'test');
        });
    });

    describe('create missing directories for path', function() {
        it('calls create missing directory for requested path if it is single segment', async function() {
            const createMissingDirectoryStub = sinon.stub(
                files,
                'createMissingDirectory'
            );
            files.createMissingDirectoriesForPath('test');
            sinon.assert.calledOnce(createMissingDirectoryStub);
            sinon.assert.calledWithExactly(createMissingDirectoryStub, 'test/');
        });

        it('calls create missing directory for each segment of requested path', async function() {
            const createMissingDirectoryStub = sinon.stub(
                files,
                'createMissingDirectory'
            );
            files.createMissingDirectoriesForPath('test/this/path');
            sinon.assert.calledThrice(createMissingDirectoryStub);
            sinon.assert.calledWithExactly(
                createMissingDirectoryStub.firstCall,
                'test/'
            );
            sinon.assert.calledWithExactly(
                createMissingDirectoryStub.secondCall,
                'test/this/'
            );
            sinon.assert.calledWithExactly(
                createMissingDirectoryStub.thirdCall,
                'test/this/path/'
            );
        });

        it('works properly with trailing slash', async function() {
            const createMissingDirectoryStub = sinon.stub(
                files,
                'createMissingDirectory'
            );
            files.createMissingDirectoriesForPath('test/');
            sinon.assert.calledOnce(createMissingDirectoryStub);
            sinon.assert.calledWithExactly(createMissingDirectoryStub, 'test/');
        });
    });

    it('creates missing launchbox directories', async function() {
        const createMissingDirectoriesForPathStub = sinon.stub(
            files,
            'createMissingDirectoriesForPath'
        );
        files.createMissingLaunchboxDirectories('LAUNCHBOX', 'GAMES');
        sinon.assert.callCount(createMissingDirectoriesForPathStub, 4);
        sinon.assert.calledWithExactly(
            createMissingDirectoriesForPathStub.firstCall,
            'LAUNCHBOX/Data/Platforms'
        );
        sinon.assert.calledWithExactly(
            createMissingDirectoriesForPathStub.thirdCall,
            'LAUNCHBOX/Images/GAMES/Screenshot - Gameplay/Hisho86'
        );
    });
});
