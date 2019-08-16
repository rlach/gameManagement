const sinon = require('sinon');
const fs = require('fs');
const download = require('image-downloader');
const downloadImage = require('../../src/scripts/download_images/download_image');

describe('downloadImage', function() {
    const launchboxPath = 'launchboxPath';
    const platformName = 'PLATFORM';
    const imageUrl = 'https://very.good.link/image.jpg';
    const imageFilename = 'image.jpg';
    let image;
    let imageDownload;
    beforeEach(async () => {
        image = {
            uri: imageUrl,
            filename: imageFilename,
        };
        imageDownload = sinon.stub(download, 'image');
    });

    afterEach(async () => {
        sinon.verifyAndRestore();
    });

    it('Downloads image as screenshot when type is missing', async () => {
        await downloadImage.downloadImage(launchboxPath, platformName, image);
        sinon.assert.calledWith(imageDownload, {
            dest:
                'launchboxPath/Images/PLATFORM/Screenshot - Gameplay/image.jpg',
            url: 'https://very.good.link/image.jpg',
        });
    });

    it('Downloads image as screenshot when type is screenshot', async () => {
        image.type = 'screenshot';
        await downloadImage.downloadImage(launchboxPath, platformName, image);
        sinon.assert.calledWith(imageDownload, {
            dest:
                'launchboxPath/Images/PLATFORM/Screenshot - Gameplay/image.jpg',
            url: 'https://very.good.link/image.jpg',
        });
    });

    it('Downloads image as box front (reconstructed) when type is box', async () => {
        image.type = 'box';
        await downloadImage.downloadImage(launchboxPath, platformName, image);
        sinon.assert.calledWith(imageDownload, {
            dest:
                'launchboxPath/Images/PLATFORM/Box - Front - Reconstructed/image.jpg',
            url: 'https://very.good.link/image.jpg',
        });
    });

    it('Downloads image as clear logo when type is background', async () => {
        image.type = 'background';
        await downloadImage.downloadImage(launchboxPath, platformName, image);
        sinon.assert.calledWith(imageDownload, {
            dest: 'launchboxPath/Images/PLATFORM/Clear Logo/image.jpg',
            url: 'https://very.good.link/image.jpg',
        });
    });

    it('Skips download when file already exists', async () => {
        sinon.stub(fs, 'existsSync').returns(true);
        image.type = 'background';
        await downloadImage.downloadImage(launchboxPath, platformName, image);
        sinon.assert.notCalled(imageDownload);
    });
});
