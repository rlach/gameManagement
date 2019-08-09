const log = require('../logger');
const mongoose = require('mongoose');
const db = mongoose.connection;

db.on('error', log.error.bind(log, 'connection error:'));
db.once('open', function() {
    log.debug('Connected to database');
});
mongoose.set('useCreateIndex', true);

async function connect(mongoUri) {
    await mongoose.connect(
        mongoUri,
        { useNewUrlParser: true }
    );
}

module.exports = {
    mongoose: mongoose,
    connect,
    db: db
};