const gameManagement = require('./gameManagement');
const { db } = require('./database/database');
const vndb = require('./vndb');

async function main() {
    let operation;
    process.argv.forEach(function(val) {
        const command = val.split('=');
        if (command.length === 2) {
            if (command[0] === 'script') {
                operation = command[1];
            }
        }
    });

    await gameManagement(operation);
}

main()
    .catch(e => {
        log.error(`Failure in main process`, e);
    })
    .finally(async () => {
        db.close();
        await vndb.disconnect();
    });
