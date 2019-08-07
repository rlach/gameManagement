const log = require('../logger');
const { datastore } = require('nedb-promise');

const DB = datastore({
    filename: 'games.db',
    autoload: true
});

DB.close = () => {};

async function connect() {
    log.debug('Connected to nedb');
}

module.exports = {
    db: DB,
    connect
};