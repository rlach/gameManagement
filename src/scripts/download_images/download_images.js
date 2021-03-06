const log = require('../../util/logger');
const queue = require('async/queue');
const downloadImage = require('./download_image');
const progress = require('../../util/progress');
const files = require('../../util/files');

const operation = 'Downloading images';

async function downloadImages(settings, database) {
    const images = await database.image.find({
        status: 'toDownload',
    });

    if (images.length > 0) {
        const progressBar = progress.getBar(operation);
        progressBar.start(images.length, 0);
        files.createMissingLaunchboxDirectories(
            settings.launchboxPath,
            settings.launchboxPlatform
        );

        const q = queue(async image => {
            return downloadImage.downloadImage(
                settings.launchboxPath,
                settings.launchboxPlatform,
                image
            );
        }, 5);

        for (const image of images) {
            q.push(image, async err => {
                if (err) {
                    image.status = 'errored';
                } else {
                    image.status = 'downloaded';
                }
                progressBar.increment();
                await database.image.save(image);
            });
        }
        q.error((err, task) => {
            log.info(`Error ${err} in ${task.gameId}`);
        });
        q.drain(() => {
            progressBar.stop();
            log.info('Success');
        });

        await q.drain();
    }
}

module.exports = downloadImages;
