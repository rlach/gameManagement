const log = require('../logger');
const fs = require('fs');
const { getGameMetadata } = require("./dmm");
const { parseSite } = require('../html');

async function main() {
    log.info('start');
    const file = fs.readFileSync('./sample/dlsoftdmm.html');

    const query = parseSite(file);

    log.info('result', getGameMetadata(query));

    // log.info('find', await dlsiteStrategy.getAdditionalImages('VJ008300'))
}

main().catch(e => log.debug('Error in main process', e));
