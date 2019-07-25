var bunyan = require('bunyan'),
    bformat = require('bunyan-format'),
    formatOut = bformat({outputMode: 'short'});

var settings = require('./settings');

var log = bunyan.createLogger({name: 'app', stream: formatOut, level: settings.logLevel});

module.exports = log;
