const files = require('./files');
const log = require('./logger');

const mainPath = './sample';

async function main() {
    log.info(`Reading ${mainPath}`);
    const foundFiles = await files.readDir(mainPath);

    for(const file in foundFiles) {

    }
}

main()
    .catch(e => log.error('Main process crashed', e));