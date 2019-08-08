const bunyan = require('bunyan'),
    bformat = require('bunyan-format'),
    formatOut = bformat({ outputMode: 'short' });

const settings = require('./settings');

const log = bunyan.createLogger({ name: 'app', stream: formatOut, level: settings.logLevel });

if (process.env.NODE_ENV === "test") {
    log.level(bunyan.FATAL + 1);
}

module.exports = log;
