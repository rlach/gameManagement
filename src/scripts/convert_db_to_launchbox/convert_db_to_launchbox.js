const fs = require('fs');
const log = require('../../logger');
const settings = require('../../settings');
const convert = require('xml-js');
const UUID = require('uuid');
const mapper = require('../../mapper');
const downloadImages = require('./download_images');
const externalLaunchboxProperties = require('./external_launchbox_properties');
const progress = require('../../progress');

const LAUNCHBOX_PLATFORM_XML = `${settings.paths.launchbox}/Data/Platforms/${settings.launchboxPlatform}.xml`;
const operation = 'Converting database to launchbox';

async function convertDbToLaunchbox(database) {
    const progressBar = progress.getBar(operation);

    let launchboxGames = [];
    let customFields = [];
    let originalCustomFields = [];
    let originalObject;

    if (fs.existsSync(LAUNCHBOX_PLATFORM_XML)) {
        log.debug('Platform file already exists, backing up');

        fs.copyFileSync(
            LAUNCHBOX_PLATFORM_XML,
            `${settings.paths.backup}/${settings.launchboxPlatform}-backup.xml`
        );

        log.debug('Also, read old file so we can keep ids unchanged');
        const launchboxXml = fs.readFileSync(LAUNCHBOX_PLATFORM_XML, 'utf8');
        originalObject = convert.xml2js(launchboxXml, { compact: true });
        if (originalObject.LaunchBox.Game.length > 0) {
            launchboxGames = originalObject.LaunchBox.Game;
        } else if (originalObject.LaunchBox.Game) {
            launchboxGames.push(originalObject.LaunchBox.Game);
        }
        if (
            originalObject.LaunchBox.CustomField &&
            originalObject.LaunchBox.CustomField.length > 0
        ) {
            originalCustomFields = originalObject.LaunchBox.CustomField;
        } else if (originalObject.LaunchBox.CustomField) {
            originalCustomFields = [originalObject.LaunchBox.CustomField];
        }
    }

    const games = await database.game.Game.find({});

    const convertedGames = [];

    progressBar.start(games.length, 0);
    for (const [index, game] of games.entries()) {
        progress.updateName(progressBar, `${operation} [${game.id}]`);
        if (!game.deleted) {
            let matchingGame;
            if (settings.externalIdField === 'CustomField') {
                const idAdditionalField = originalCustomFields.find(
                    f =>
                        f.Name._text === 'externalId' &&
                        f.Value._text === game.id
                );
                if (idAdditionalField) {
                    matchingGame = launchboxGames.find(
                        g => g.ID._text === idAdditionalField.GameID._text
                    );
                }
            } else {
                matchingGame = launchboxGames.find(
                    g => g[settings.externalIdField]._text === game.id
                );
            }
            const launchboxId = getUUID(game.id, matchingGame);

            customFields.push(
                ...originalCustomFields.filter(
                    cf => cf.GameID._text === launchboxId
                )
            );

            if (settings.downloadImages) {
                progress.updateName(
                    progressBar,
                    `${operation} [${game.id}] (downloading images)`
                );
                await downloadImages(game, launchboxId, database.game);
                progress.updateName(progressBar, `${operation} [${game.id}]`);
            }

            const result = mapper.map(game);
            result.ID = {
                _text: launchboxId,
            };

            if (game.engine) {
                addOrUpdateAdditionalField(
                    customFields,
                    launchboxId,
                    'engine',
                    game.engine
                );
            }

            if (matchingGame) {
                Object.assign(matchingGame, result);
                convertedGames.push(matchingGame);
            } else {
                convertedGames.push({
                    ...result,
                    ...externalLaunchboxProperties,
                });
                if (settings.externalIdField === 'CustomField') {
                    addOrUpdateAdditionalField(
                        customFields,
                        launchboxId,
                        'externalId',
                        game.id
                    );
                }
            }
        }
        progressBar.update(index + 1);
    }

    let objectToExport;
    if (originalObject) {
        originalObject.LaunchBox.Game = convertedGames;
        originalObject.LaunchBox.CustomField = customFields;
        objectToExport = originalObject;
    } else {
        objectToExport = {
            _declaration: {
                _attributes: {
                    version: '1.0',
                    standalone: 'yes',
                },
            },
            LaunchBox: {
                Game: convertedGames,
                CustomField: customFields,
            },
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

    progress.updateName(progressBar, operation);
    progressBar.stop();
}

function getUUID(gameId, matchingGame) {
    if (matchingGame && matchingGame.ID && matchingGame.ID._text) {
        return matchingGame.ID._text;
    } else {
        return UUID.v4();
    }
}

function addOrUpdateAdditionalField(customFields, launchboxId, name, value) {
    const additionalField = customFields.find(
        f => f.Name._text === name && f.GameID._text === launchboxId
    );
    if (additionalField) {
        additionalField.Value._text = value;
    } else {
        customFields.push({
            GameID: {
                _text: launchboxId,
            },
            Name: {
                _text: name,
            },
            Value: {
                _text: value,
            },
        });
    }
}

module.exports = convertDbToLaunchbox;
