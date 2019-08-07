const settings = require('../settings');

if (settings.database === 'nedb') {
    const { datastore } = require('nedb-promise');

    const DB = datastore({
        filename: 'games.db',
        autoload: true
    });

    DB.close = () => {};

    async function connect() {
        return;
    }

    module.exports = {
        db: DB,
        connect
    };
} else {
    const log = require('../logger');
    const mongoose = require('mongoose');
    var db = mongoose.connection;

    db.on('error', log.error.bind(log, 'connection error:'));
    db.once('open', function() {
        log.debug('Connected to database');
    });
    mongoose.set('useCreateIndex', true);

    async function connect() {
        await mongoose.connect(
            settings.mongoUri,
            { useNewUrlParser: true }
        );
    }

    module.exports = {
        mongoose: mongoose,
        connect,
        db: db
    };
}
