const bunyan = require('bunyan'),
    bformat = require('bunyan-format'),
    formatOut = bformat({ outputMode: 'short' });

const config = require('config');

const log = bunyan.createLogger({
    name: 'app',
    stream: formatOut,
    level: config.get('logLevel'),
});

module.exports = log;
