const progress = require('../util/progress');
const regedit = require('../util/regedit');

const dpiSettingsKey =
    'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';

async function updateDpiSettings(database, shouldUpdateDpi) {
    if (shouldUpdateDpi && process.platform === 'win32') {
        const progressBar = progress.getBar('Update dpi settings');

        const gamesWithExecutableFile = await database.game.find({
            executableFile: {
                $exists: true,
            },
        });

        if (gamesWithExecutableFile.length > 0) {
            const existingKeys = await regedit.list(dpiSettingsKey);

            let values = {};

            gamesWithExecutableFile.forEach(game => {
                if (existingKeys[game.executableFile] === undefined) {
                    values[game.executableFile] = {
                        value: '~ GDIDPISCALING DPIUNAWARE',
                        type: 'REG_SZ',
                    };
                }
            });

            if (Object.keys(values).length > 0) {
                progressBar.start(Object.keys(values).length, 0);
                await regedit.putValue(dpiSettingsKey, values);
                progressBar.update(Object.keys(values).length);
                progressBar.stop();
            }
        }
    }
}

module.exports = updateDpiSettings;
