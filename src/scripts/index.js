module.exports = {
    selfTest: require('./self_test').selfTest,
    updateDpiSettings: require('./update_dpi_settings'),
    scanDirectories: require('./scan_directories/scan_directories'),
    downloadSources: require('./download_sources'),
    convertDbToLaunchbox: require('./convert_db_to_launchbox/convert_db_to_launchbox'),
    getPossibleCodes: require('./get_possible_codes'),
    organizeDirectories: require('./organize_directories/organize_directories'),
    syncLaunchboxToDb: require('./sync_launchbox_to_db'),
    findPossibleDuplicates: require('./find_possible_duplicates'),
    downloadImages: require('./download_images/download_images'),
    setForceUpdate: require('./set_force_update'),
};
