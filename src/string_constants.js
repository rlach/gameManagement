const IMAGE_PATHS = {
    PACKAGE: 'Box - Front - Reconstructed', // Use reconstructed so when user uploads his own box front to 'Box - Front' it will be used instead
    BACKGROUND: 'Clear Logo', // So user can use 'Fanart - Background' which has higher priority,
    SCREENSHOT: 'Screenshot - Gameplay',
};

const DPI_SETTINGS = {
    APPLICATION: '~ HIGHDPIAWARE',
    SYSTEM: '~ DPIUNAWARE',
    SYSTEM_ENHANCED: '~ GDIDPISCALING DPIUNAWARE',
};

module.exports = { IMAGE_PATHS, DPI_SETTINGS };
