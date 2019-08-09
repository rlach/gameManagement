//those properties are left for Launchbox to fully manage
//on creation we leave them empty or default and don't overwrite them during sync
const externalLaunchboxProperties = {
    CommandLine: {},
    ConfigurationCommandLine: {},
    ConfigurationPath: {},
    DosBoxConfigurationPath: {},
    Emulator: {},
    ManualPath: {},
    MusicPath: {},
    Publisher: {},
    ScummVMAspectCorrection: {
        _text: 'false',
    },
    ScummVMFullscreen: {
        _text: 'false',
    },
    ScummVMGameDataFolderPath: {},
    ScummVMGameType: {},
    UseDosBox: {
        _text: 'false',
    },
    UseScummVM: {
        _text: 'false',
    },
    PlayMode: {},
    Region: {},
    VideoPath: {},
    MissingVideo: {
        _text: 'true',
    },
    MissingBoxFrontImage: {
        _text: 'false',
    },
    MissingScreenshotImage: {
        _text: 'false',
    },
    MissingClearLogoImage: {
        _text: 'false',
    },
    MissingBackgroundImage: {
        _text: 'false',
    },
    UseStartupScreen: {
        _text: 'false',
    },
    HideAllNonExclusiveFullscreenWindows: {
        _text: 'false',
    },
    StartupLoadDelay: {
        _text: '0',
    },
    HideMouseCursorInGame: {
        _text: 'false',
    },
    DisableShutdownScreen: {
        _text: 'false',
    },
    AggressiveWindowHiding: {
        _text: 'false',
    },
    OverrideDefaultStartupScreenSettings: {
        _text: 'false',
    },
    UsePauseScreen: {
        _text: 'false',
    },
    OverrideDefaultPauseScreenSettings: {
        _text: 'false',
    },
    SuspendProcessOnPause: {
        _text: 'false',
    },
    ForcefulPauseScreenActivation: {
        _text: 'false',
    },
    CustomDosBoxVersionPath: {},
};

module.exports = externalLaunchboxProperties;
