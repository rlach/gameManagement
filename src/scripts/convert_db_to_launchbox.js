const { Game } = require('../database/game');
const moment = require('moment/moment');
const fs = require('fs');
const log = require('../logger');
const { db, connect } = require('../database/mongoose');
const settings = require('../settings');
const convert = require('xml-js');
const UUID = require('uuid');

const LAUNCHBOX_PLATFORM_XML = `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`;

async function convertDbToLaunchbox() {
    await connect();

    let launchboxGames = [];
    let originalObject;

    if (fs.existsSync(LAUNCHBOX_PLATFORM_XML)) {
        log.debug('Platform file already exists, backing up');
        fs.copyFileSync(LAUNCHBOX_PLATFORM_XML, `${settings.paths.backup}/${settings.launchboxPlatform}-backup.xml`);

        log.debug('Also, read old file so we can keep ids unchanged');
        const launchboxXml = fs.readFileSync(LAUNCHBOX_PLATFORM_XML, 'utf8');
        originalObject = convert.xml2js(launchboxXml, { compact: true });
        if (originalObject.LaunchBox.Game.length > 0) {
            launchboxGames = originalObject.LaunchBox.Game;
        }
    }

    const games = await Game.find({});

    const convertedGames = [];

    for (const game of games) {
        if (game.deleted) {
            continue;
        }

        const matchingGame = launchboxGames.find(g => g.SortTitle._text === game.id);

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
            CommunityStarRating: {
                _text: game.communityStars ? game.communityStars : 0
            },
            CommunityStarRatingTotalVotes: {
                _text: game.communityStarVotes ? game.communityStarVotes : 0
            },
            DateAdded: {
                _text: game.dateAdded ? game.dateAdded : moment().format()
            },
            DateModified: {
                _text: game.dateModified ? game.dateModified : moment().format()
            },
            ReleaseDate: {
                _text: game.releaseDate ? game.releaseDate : moment().format()
            },
            LastPlayedDate: matchingGame
                ? matchingGame.LastPlayedDate
                : {
                      _text: '1800-01-01T01:33:35.9365244+02:00'
                  },
            Developer: {
                _text: getDeveloper(game)
            },
            Favorite: {
                _text: game.favorite ? game.favorite : false
            },
            ID: {
                _text: getUUID(game.id, matchingGame)
            },
            Notes:
                game.descriptionEn || game.descriptionJp
                    ? {
                          _text: (game.descriptionEn ? game.descriptionEn : game.descriptionJp).replace(
                              invalidChars,
                              ''
                          )
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

        if (matchingGame) {
            Object.assign(matchingGame, gameProperties);
            convertedGames.push(matchingGame);
        } else {
            convertedGames.push({
                ...gameProperties,
                ...externalGameProps
            });
        }
    }

    let objectToExport;
    if (originalObject) {
        originalObject.LaunchBox.Game = convertedGames;
        objectToExport = originalObject;
    } else {
        objectToExport = {
            _declaration: {
                _attributes: {
                    version: '1.0',
                    standalone: 'yes'
                }
            },
            LaunchBox: {
                Game: convertedGames
            }
        };
    }

    const xml = convert.js2xml(objectToExport, { compact: true });
    if (!fs.existsSync(`${settings.paths.launchbox}/Data`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Data`);
    }
    if (!fs.existsSync(`${settings.paths.launchbox}/Data/Platforms`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Data/Platforms`);
    }
    fs.writeFileSync(LAUNCHBOX_PLATFORM_XML, xml);

    db.close();
}

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
    let filename = game.nameEn ? game.nameEn : game.nameJp;
    filename = filename.replace(/[\?*':\/\<\>"]/gi, '_'); //Replace banned characters with underscore like launchbox does

    if (!fs.existsSync(`${settings.paths.launchbox}/Images`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images`);
    }
    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}`);
    }
    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Box - Front`);
    }

    const targetPathMainImage = `${settings.paths.launchbox}/Images/${
        settings.launchboxPlatform
    }/Box - Front/${filename}-01${imageUrl.match(regexExtension)[0]}`;

    if (fs.existsSync(targetPathMainImage)) {
        log.debug('Image already exists, skipping', targetPathMainImage);
    } else {
        log.debug('Downloading main image', {
            imageUrl,
            filename,
            targetPath: targetPathMainImage
        });

        try {
            await download.image({
                url: imageUrl,
                dest: targetPathMainImage
            });
        } catch (e) {
            log.error('Error downloading image', e);
        }
    }

    if (!fs.existsSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Screenshot - Gameplay`)) {
        fs.mkdirSync(`${settings.paths.launchbox}/Images/${settings.launchboxPlatform}/Screenshot - Gameplay`);
    }
    if (game.additionalImages) {
        for (const [index, additionalImage] of game.additionalImages.entries()) {
            log.debug('Processing additionalImage', additionalImage);
            const targetPathAdditionalImage = `${settings.paths.launchbox}/Images/${
                settings.launchboxPlatform
            }/Screenshot - Gameplay/${filename}-${String(index + 1).padStart(2, '0')}${
                additionalImage.match(regexExtension)[0]
            }`;

            if (fs.existsSync(targetPathAdditionalImage)) {
                log.debug('Additional image already exists, skipping', targetPathAdditionalImage);
            } else {
                log.debug('Downloading additional image', {
                    additionalImage,
                    filename,
                    targetPath: targetPathAdditionalImage
                });

                try {
                    await download.image({
                        url: additionalImage,
                        dest: targetPathAdditionalImage
                    });
                } catch (e) {
                    log.error('Error downloading image', e);
                }
            }
        }
    }
}

function getUUID(gameId, matchingGame) {
    if (matchingGame && matchingGame.ID && matchingGame.ID._text) {
        return matchingGame.ID._text;
    } else {
        return UUID.v4();
    }
}

// remove everything forbidden by XML 1.0 specifications, plus the unicode replacement character U+FFFD
const invalidChars = /([^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFC\u{10000}-\u{10FFFF}])/gu;

module.exports = convertDbToLaunchbox;
