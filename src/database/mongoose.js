const log = require('../logger');
const mongoose = require('mongoose');
var db = mongoose.connection;

db.on('error', log.error.bind(log, 'connection error:'));
db.once('open', function () {
    log.info('Connected to database');
});
mongoose.set('useCreateIndex', true);

async function connect() {
    await mongoose.connect(
        'mongodb://localhost/test',
        {useNewUrlParser: true}
    );
}

module.exports = {
    mongoose: mongoose,
    connect,
    db: db
};
