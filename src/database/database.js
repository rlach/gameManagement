async function initDatabase(settings) {
    if (settings.database === 'nedb') {
        const { datastore } = require('nedb-promise');

        const database = datastore({
            filename: settings.nedbFilename,
            autoload: true,
        });

        const databaseImages = datastore({
            filename: 'images.db',
            autoload: true,
        });

        database.close = () => {};
        databaseImages.close = () => {};

        const { getGame } = require('./game/nedbGame');
        const { getImage } = require('./image/nedbImage');

        return {
            game: getGame(database),
            image: getImage(databaseImages),
            close: () => {}
        };
    } else {
        const mongoose = require('./mongoose');
        await mongoose.connect(settings.mongoUri);
        const { getGame } = require('./game/mongooseGame');

        return {
            game: getGame(mongoose.mongoose),
            //TODO: return image collection for mongoose
            close: mongoose.db.close
        };
    }
}

module.exports = { initDatabase };
