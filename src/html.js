const iconv = require('iconv-lite');
const htmlparser = require('htmlparser');
const request = require('request-promise');
const log = require('./logger');

const JAPANESE_ENCODING = 'EUC-JP';

function parseSite(rawHtml) {
    const handler = new htmlparser.DefaultHandler(function(error, dom) {
        if (error) {
            log.debug('Error parsing html', error);
        } else {
            log.debug('Parsing done!');
        }
    });
    const parser = new htmlparser.Parser(handler);
    parser.parseComplete(rawHtml);
    log.debug('Dom parsed!');
    return handler.dom;
}

async function callPage(uri) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            reject('Promise timed out after ' + 30000 + ' ms');
        }, 30000);

        request
            .get({
                method: 'GET',
                uri: uri,
                encoding: null
            })
            .pipe(iconv.decodeStream(JAPANESE_ENCODING))
            .collect(function(err, decodedBody) {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(decodedBody);
                }
            });
    });
}

module.exports = { callPage, parseSite };
