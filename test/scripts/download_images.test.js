const sinon = require('sinon');
const progress = require('../../src/util/progress');
const { initDatabase } = require('../../src/database/database');
const { expect } = require('chai');
const download = require('image-downloader');
const files = require('../../src/util/files');

const downloadImages = require('../../src/scripts/download_images/download_images');

describe('downloadImages', function() {
    let database;
    let progressBarStart;
    let progressBarStop;

    beforeEach(async function() {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });

        progressBarStart = sinon.spy();
        progressBarStop = sinon.spy();
        sinon.stub(progress, 'getBar').returns({
            start: progressBarStart,
            increment: sinon.spy(),
            stop: progressBarStop,
        });

        sinon.stub(files, 'createMissingLaunchboxDirectories');
        sinon.stub(files, 'createMissingDirectory');
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Completes without downloading anything when there are no images', async function() {
        await downloadImages({}, database);
        sinon.assert.notCalled(progressBarStart);
    });

    it('Completes without downloading anything when there are no images in toDownload status', async function() {
        database.image.save({
            status: 'downloaded',
        });
        database.image.save({
            status: 'errored',
        });
        await downloadImages({}, database);
        sinon.assert.notCalled(progressBarStart);
    });

    it('Marks image as errored if it has toDownload status and there is an error downloading', async function() {
        await database.image.save({
            status: 'toDownload',
        });
        await downloadImages({}, database);
        sinon.assert.calledOnce(progressBarStart);
        const images = await database.image.find({});
        expect(images).to.have.lengthOf(1);
        expect(images[0]).to.include({ status: 'errored' });
        sinon.assert.calledOnce(progressBarStop);
    });

    it('Marks image as downloaded if it has toDownload status and download succeed', async function() {
        await database.image.save({
            status: 'toDownload',
        });
        const imageDownload = sinon.stub(download, 'image');

        await downloadImages({}, database);
        sinon.assert.calledOnce(progressBarStart);
        sinon.assert.calledOnce(imageDownload);
        const images = await database.image.find({});
        expect(images).to.have.lengthOf(1);
        expect(images[0]).to.include({ status: 'downloaded' });
        sinon.assert.calledOnce(progressBarStop);
    });

    it('Handles multiple images', async function() {
        for (let i = 0; i < 10; i++) {
            await database.image.save({
                status: 'toDownload',
            });
        }
        const imageDownload = sinon
            .stub(download, 'image')
            .onFirstCall()
            .throws();

        await downloadImages({}, database);
        sinon.assert.calledOnce(progressBarStart);
        sinon.assert.callCount(imageDownload, 10);
        const imagesErrored = await database.image.find({
            status: 'errored',
        });
        expect(imagesErrored).to.have.lengthOf(1);
        const imagesDownloaded = await database.image.find({
            status: 'downloaded',
        });
        expect(imagesDownloaded).to.have.lengthOf(9);
        sinon.assert.calledOnce(progressBarStop);
    });
});
