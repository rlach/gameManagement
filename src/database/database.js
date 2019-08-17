async function initDatabase(settings) {
    /* istanbul ignore else */
    if (settings.database === 'nedb') {
        const { datastore } = require('nedb-promise');

        const database = datastore({
            filename:
                settings.nedbExtension === ''
                    ? ''
                    : `games${settings.nedbExtension}`,
            autoload: true,
        });

        const databaseImages = datastore({
            filename:
                settings.nedbExtension === ''
                    ? ''
                    : `images${settings.nedbExtension}`,
            autoload: true,
        });

        /* istanbul ignore next */
        database.close = () => {};
        /* istanbul ignore next */
        databaseImages.close = () => {};

        const { getGame } = require('./game/nedbGame');
        const { getImage } = require('./image/nedbImage');

        return {
            game: getGame(database),
            image: getImage(databaseImages),
            close: () => {},
        };
    } else {
        const mongoose = require('./mongoose');
        await mongoose.connect(settings.mongoUri);
        const { getGame } = require('./game/mongooseGame');
        const { getImage } = require('./image/mongooseImage');

        return {
            game: getGame(mongoose.mongoose),
            image: getImage(mongoose.mongoose),
            close: mongoose.db.close.bind(mongoose.db),
        };
    }
}

module.exports = { initDatabase };
