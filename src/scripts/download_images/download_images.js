const log = require('../../logger');
const queue = require('async/queue');
const { createMissingDirectories, downloadImage } = require('./download_image');

async function downloadImages(settings, database) {
    const images = await database.image.find({
        status: 'toDownload',
    });

    if(images.length > 0) {
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

        for(const image of images) {
            q.push(image, async (err) => {
                if(err) {
                    image.status = 'errored';
                } else {
                    image.status = 'downloaded';
                }
                await database.image.save(image);
            });
        }
        q.error((err, task) => {
            log.info(`Error ${err} in ${task.gameId}`);
        });
        q.drain(() => {
            log.info('Success');
        });

        await q.drain();
    }
}

module.exports = downloadImages;
