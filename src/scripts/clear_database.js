const { dropDatabase } = require('../database/mongoose');
const log = require('../logger');
const inquirer = require('inquirer');

async function clearDb() {
    let answer = await inquirer.prompt({
        type: 'confirm',
        name: 'drop',
        message: 'Do you REALLY want to erase the database?'
    });

    if(answer.drop) {
        let answer2 = await inquirer.prompt({
            type: 'confirm',
            name: 'drop',
            message: 'This cannot be undone. Are you REALLY sure you want to erase the database?'
        });

        if(answer2.drop) {
            log.info('Erasing the database. Bye.');
            await dropDatabase();
        }
    }
}

module.exports = clearDb;
