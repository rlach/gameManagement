const log = require('../../logger');
const queue = require('async/queue');
const { createMissingDirectories, downloadImage } = require('./download_image');
const progress = require('../../progress');

const operation = 'Downloading images';

async function downloadImages(settings, database) {
    const images = await database.image.find({
        status: 'toDownload',
    });

    if (images.length > 0) {
        const progressBar = progress.getBar(operation);
        progressBar.start(images.length, 0);
        createMissingDirectories(
            settings.launchboxPath,
            settings.launchboxPlatform
        );

        const q = queue(async image => {
            return downloadImage(
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
