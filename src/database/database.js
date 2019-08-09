async function initDatabase(settings) {
    if (settings.database === 'nedb') {
        const { datastore } = require('nedb-promise');

        const database = datastore({
            filename: settings.nedbFilename,
            autoload: true,
        });

        database.close = () => {};

        const { getGame } = require('./game/nedbGame');

        return {
            game: getGame(database),
            database,
        };
    } else {
        const mongoose = require('./mongoose');
        await mongoose.connect(settings.mongoUri);
        const database = mongoose.db;
        const { getGame } = require('./game/mongooseGame');

        return {
            game: getGame(mongoose.mongoose),
            database,
        };
    }
}

module.exports = { initDatabase };
