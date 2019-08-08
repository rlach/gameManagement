module.exports = {
    buildDbFromFolders: require('./build_db_from_folders/build_db_from_folders'),
    convertDbToLaunchbox: require('./convert_db_to_launchbox/convert_db_to_launchbox'),
    getPossibleCodes: require('./get_possible_codes'),
    organizeDirectories: require('./organize_directories/organize_directories'),
    syncLaunchboxToDb: require('./sync_launchbox_to_db'),
    findPossibleDuplicates: require('./find_possible_duplicates'),
    setForceUpdate: require('./set_force_update')
};
