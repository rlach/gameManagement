/* istanbul ignore file */
const GameManagement = require('./gameManagement');
const vndb = require('./util/vndb');
const settings = require('./settings');
const log = require('./util/logger');

async function main() {
    await vndb.connect();

    let operation;
    process.argv.forEach(function(val) {
        const command = val.split('=');
        if (command.length === 2) {
            if (command[0] === 'script') {
                operation = command[1];
            }
        }
    });

    const gameManagement = new GameManagement(settings, operation);
    await gameManagement.main();
}

main()
    .catch(e => {
        log.error(`Failure in main process`, e);
    })
    .finally(async () => {
        await vndb.disconnect();
    });
