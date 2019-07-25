const { Game } = require('./database/game');

const fs = require('fs');
const { promisify } = require('util');
const log = require('./logger');
const { db, connect } = require('./database/mongoose');
const settings = require('./settings');
const convert = require('xml-js');
const UUID = require('uuid');

async function main() {
    log.info(`Reading ${settings.paths.main}`);
    await connect();

    const games = await Game.find({});

    const convertedGames = [];

    for (const game of games) {
        if (settings.downloadImages) {
            await downloadImages(game);
        }

        const gameProperties = {
            ApplicationPath: game.executableFile
                ? {
                      _text: game.executableFile
                  }
                : {},
            Completed: {
                _text: game.completed ? game.completed : 'false'
            },
            DateAdded: {
                //todo: Make sure the format of the dates is '2019-07-25T01:47:19.966921+02:00' (ISOString?)
                _text: game.dateAdded ? game.dateAdded : new Date().toISOString()
            },
            DateModified: {
                _text: game.dateModified ? game.dateModified : new Date().toISOString()
            },
            Developer: {
                _text: getDeveloper(game)
            },
            Favorite: {
                _text: game.favorite ? game.favorite : false
            },
            ID: {
                //On creation we need to create some UUID
                _text: UUID.v4()
            },
            Notes:
                game.descriptionEn || game.descriptionJp
                    ? {
                          _text: game.descriptionEn ? game.descriptionEn : game.descriptionJp
                      }
                    : {},
            Platform: {
                _text: settings.launchboxPlatform
            },
            Rating: game.rating
                ? {
                      _text: game.rating
                  }
                : {},
            RootFolder: game.directory
                ? {
                      _text: game.directory
                  }
                : {},
            SortTitle: {
                _text: game.id
            },
            Source: game.source
                ? {
                      _text: game.source
                  }
                : {},
            StarRatingFloat: {
                _text: game.stars ? game.stars : 0
            },
            StarRating: {
                _text: game.stars ? Math.floor(game.stars) : 0
            },
            Title:
                game.nameEn || game.nameJp
                    ? {
                          _text: game.nameEn ? game.nameEn : game.nameJp
                      }
                    : {},
            Version: game.version
                ? {
                      _text: game.version
                  }
                : {},
            Series: game.series
                ? {
                      _text: game.series
                  }
                : {},
            Portable: {
                _text: game.portable ? game.portable : 'false'
            },
            Hide: {
                _text: game.hide ? game.hide : 'false'
            },
            Broken: {
                _text: game.broken ? game.broken : 'false'
            },
            Genre: {
                _text: getGenres(game)
            }
        };

        convertedGames.push({
            ...gameProperties,
            ...externalGameProps
        });
    }

    const objectToExport = {
        _declaration: {
            _attributes: {
                version: 1.0,
                standalone: 'yes'
            }
        },
        LaunchBox: {
            Game: convertedGames
        }
    };

    const xml = convert.js2xml(objectToExport, { compact: true });
    require('fs').writeFileSync(`./sample/launchbox/${settings.launchboxPlatform}.xml`, xml);

    // log.info('xml', xml);
    //
    // var launchboxXml = require('fs').readFileSync('./sample/launchbox/WINDOWS.xml', 'utf8');
    // const convetedObject = convert.xml2js(launchboxXml, { compact: true });
    // log.info('object', JSON.stringify(convetedObject, null, 4));
    db.close();
}

main().catch(e => {
    log.error('Main process crashed', e);
    db.close();
});

function getGenres(game) {
    const genres = game.genresEn ? game.genresEn : game.genresJp;
    return genres ? genres.join(';') : '';
}

function getDeveloper(game) {
    const gameMaker = game.makerEn ? game.makerEn : game.makerJp;
    return gameMaker ? gameMaker : '';
}

//those properties are left for Launchbox to fully manage
//on creation we leave them empty or default and don't overwrite them during sync
const externalGameProps = {
    CommandLine: {},
    ConfigurationCommandLine: {},
    ConfigurationPath: {},
    DosBoxConfigurationPath: {},
    Emulator: {},
    LastPlayedDate: {},
    ManualPath: {},
    MusicPath: {},
    Publisher: {},
    ScummVMAspectCorrection: {
        _text: 'false'
    },
    ScummVMFullscreen: {
        _text: 'false'
    },
    ScummVMGameDataFolderPath: {},
    ScummVMGameType: {},
    CommunityStarRating: {
        _text: '0'
    },
    CommunityStarRatingTotalVotes: {
        _text: '0'
    },
    Status: {},
    UseDosBox: {
        _text: 'false'
    },
    UseScummVM: {
        _text: 'false'
    },
    PlayMode: {},
    Region: {},
    PlayCount: {
        _text: '0'
    },
    VideoPath: {},
    MissingVideo: {
        _text: 'true'
    },
    MissingBoxFrontImage: {
        _text: 'false'
    },
    MissingScreenshotImage: {
        _text: 'false'
    },
    MissingClearLogoImage: {
        _text: 'false'
    },
    MissingBackgroundImage: {
        _text: 'false'
    },
    UseStartupScreen: {
        _text: 'false'
    },
    HideAllNonExclusiveFullscreenWindows: {
        _text: 'false'
    },
    StartupLoadDelay: {
        _text: '0'
    },
    HideMouseCursorInGame: {
        _text: 'false'
    },
    DisableShutdownScreen: {
        _text: 'false'
    },
    AggressiveWindowHiding: {
        _text: 'false'
    },
    OverrideDefaultStartupScreenSettings: {
        _text: 'false'
    },
    UsePauseScreen: {
        _text: 'false'
    },
    OverrideDefaultPauseScreenSettings: {
        _text: 'false'
    },
    SuspendProcessOnPause: {
        _text: 'false'
    },
    ForcefulPauseScreenActivation: {
        _text: 'false'
    },
    CustomDosBoxVersionPath: {}
};

const download = require('image-downloader');

async function downloadImages(game) {
    const regexExtension = /\.\w{3,4}($|\?)/;
    const imageUrl = game.imageUrlEn ? game.imageUrlEn : game.imageUrlJp;
    if (!imageUrl) {
        return;
    }
    const filename = game.nameEn ? game.nameEn : game.nameJp;
    const targetPath = `./sample/launchbox/Images/Box - Front/${filename}-01${imageUrl.match(regexExtension)[0]}`;

    if(fs.existsSync(targetPath)) {
        log.info('Image already exists, skipping', targetPath);
        return;
    }

    log.info('Downloading', {
        imageUrl,
        filename,
        targetPath
    });

    try {
        await download.image({
            url: imageUrl,
            dest: targetPath
        });
    } catch(e) {
        log.error('Error downloading image', e);
    }

    log.info('past download');
}
