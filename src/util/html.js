const iconv = require('iconv-lite');
const request = require('request-promise');
const log = require('./logger');
const { Parser } = require('htmlparser2');
const { DomHandler } = require('domhandler');
const cheerio = require('cheerio');

const JAPANESE_ENCODING = 'EUC-JP';

function parseSite(rawHtml) {
    const handler = new DomHandler(function(error) {
        if (error) {
            log.debug('Error parsing html', error);
        } else {
            log.debug('Parsing done!');
        }
    });
    const parser = new Parser(handler, {
        decodeEntities: true,
    });
    parser.write(rawHtml);
    parser.end();
    log.debug('Dom parsed!');
    return cheerio.load(handler.dom);
}

async function callPage(uri) {
    const site = await request.get({
        method: 'GET',
        uri: uri,
        encoding: null,
    });

    return iconv.decode(site, JAPANESE_ENCODING);
}

module.exports = { callPage, parseSite };
