const progress = require('../util/progress');
const log = require('../util/logger');
const regedit = require('../util/regedit');
const { DPI_SETTINGS } = require('../string_constants');

const dpiSettingsKey =
    'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';

async function updateDpiSettings(database, settings, forceUpdate = false) {
    if (settings.updateDpi && process.platform === 'win32') {
        try {
            const progressBar = progress.getBar('Update dpi settings');

            const gamesWithExecutableFile = await database.game.find({
                executableFile: {
                    $exists: true,
                },
            });

            if (gamesWithExecutableFile.length > 0) {
                const registryKeys = await regedit.list(dpiSettingsKey);

                let values = [];

                for (const game of gamesWithExecutableFile) {
                    if (
                        forceUpdate ||
                        registryKeys[game.executableFile.toLowerCase()] ===
                            undefined
                    ) {
                        values.push({
                            name: game.executableFile,
                            value: getDpiValue(game.engine, settings.overrides),
                            type: 'REG_SZ',
                        });
                    }
                }

                if (values.length > 0) {
                    progressBar.start(Object.keys(values).length, 0);
                    for (const value of values) {
                        await regedit.set(
                            dpiSettingsKey,
                            value.name,
                            value.value,
                            value.type
                        );
                        progressBar.increment();
                    }
                    progressBar.update(Object.keys(values).length);
                    progressBar.stop();
                }
            }
        } catch (e) {
            log.error('Error updating dpi', e);
        }
    }
}

function getDpiValue(engine, overrides) {
    switch (overrides[engine]) {
        case 1:
            return DPI_SETTINGS.APPLICATION;
        case 2:
            return DPI_SETTINGS.SYSTEM;
        case 3:
        default:
            return DPI_SETTINGS.SYSTEM_ENHANCED;
    }
}

module.exports = updateDpiSettings;
