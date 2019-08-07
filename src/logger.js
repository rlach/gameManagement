const bunyan = require('bunyan'),
    bformat = require('bunyan-format'),
    formatOut = bformat({ outputMode: 'short' });

const settings = require('./settings');

const log = bunyan.createLogger({ name: 'app', stream: formatOut, level: settings.logLevel });

module.exports = log;
