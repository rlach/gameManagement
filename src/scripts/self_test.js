const log = require('../util/logger');
const eachLimit = require('async/eachLimit');

async function selfTest(strategies) {
    log.info('Starting self test');

    const results = [];
    await eachLimit(strategies, 5, async strategy => {
        results.push(await strategy.selfTest());
    });

    log.info('Self test results', results);
}

module.exports = selfTest;
