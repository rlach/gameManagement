const settings = require('../settings');
const log = require('./../logger');
const MongooseGame = require('./game/mongooseGame');
const NedbGame = require('./game/nedbGame');

if (settings.database === 'nedb') {
    log.debug('Using nedb database');
    module.exports = new NedbGame();
} else {
    log.debug('Using mongodb database');
    module.exports = new MongooseGame();
}
