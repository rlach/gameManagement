const settings = require('../settings');
if (settings.database === 'nedb') {
    module.exports = require('./nedb');
} else {
    module.exports = require('./mongoose');
}
