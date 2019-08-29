/* istanbul ignore file */
const regedit = require('regedit');

async function list(key) {
    return new Promise(resolve => {
        regedit.list([[key]]).on('data', function(entry) {
            resolve(entry.data.values);
        });
    });
}

async function putValue(key, values) {
    return new Promise((resolve, reject) => {
        regedit.putValue(
            {
                [key]: values,
            },
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

module.exports = { list, putValue };
