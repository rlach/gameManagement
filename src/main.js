/* istanbul ignore file */
const gameManagement = require('./gameManagement');
const vndb = require('./vndb');
const settings = require('./settings');
const log = require('./logger');

async function main() {
    await vndb.connect();

    let operation = undefined;
    process.argv.forEach(function(val) {
        const command = val.split('=');
        if (command.length === 2) {
            if (command[0] === 'script') {
                operation = command[1];
            }
        }
    });

    await gameManagement(settings, operation);
}

main()
    .catch(e => {
        log.error(`Failure in main process`, e);
    })
    .finally(async () => {
        await vndb.disconnect();
    });
