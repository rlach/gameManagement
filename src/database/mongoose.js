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

    async function dropDatabase() {
        await DB.remove({}, { multi: true });
        await DB.loadDatabase();
    }

    module.exports = {
        db: DB,
        dropDatabase,
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
            'mongodb://localhost/test',
            { useNewUrlParser: true }
        );
    }

    async function dropDatabase() {
        await db.dropDatabase();
    }

    module.exports = {
        mongoose: mongoose,
        dropDatabase,
        connect,
        db: db
    };
}
