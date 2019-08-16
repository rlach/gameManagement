const settings = require('../settings');
const log = require('./../logger');

/* istanbul ignore else */
if (settings.database === 'nedb') {
    const NedbGame = require('./game/nedbGame');
    log.debug('Using nedb database');
    module.exports = new NedbGame();
} else {
    const MongooseGame = require('./game/mongooseGame');
    log.debug('Using mongodb database');
    module.exports = new MongooseGame();
}
