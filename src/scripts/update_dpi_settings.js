const progress = require('../util/progress');
const regedit = require('regedit');

async function updateDpiSettings(database, shouldUpdateDpi) {
    if (shouldUpdateDpi && process.platform === 'win32') {
        const progressBar = progress.getBar('Update dpi settings');

        const gamesWithExecutableFile = await database.game.find({
            executableFile: {
                $exists: true,
            },
        });

        const existingKeys = await getRegistryKeys();

        let values = {};

        gamesWithExecutableFile.forEach(game => {
            if (existingKeys[game.executableFile] === undefined) {
                values[game.executableFile] = {
                    value: '~ GDIDPISCALING DPIUNAWARE',
                    type: 'REG_SZ',
                };
            }
        });

        progressBar.start(values.length, 0);
        await putRegistryKeys(values);
        progressBar.update(values.length);
        progressBar.stop();
    }
}

async function getRegistryKeys() {
    return new Promise(resolve => {
        regedit
            .list([
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
            ])
            .on('data', function(entry) {
                resolve(entry.data.values);
            });
    });
}

async function putRegistryKeys(values) {
    return new Promise((resolve, reject) => {
        regedit.putValue(
            {
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers': values,
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

module.exports = updateDpiSettings;
