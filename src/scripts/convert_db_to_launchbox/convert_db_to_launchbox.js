const fs = require('fs');
const log = require('../../util/logger');
const convert = require('xml-js');
const mapper = require('../../util/mapper');
const externalLaunchboxProperties = require('./external_launchbox_properties');
const progress = require('../../util/progress');
const files = require('../../util/files');
const { ensureArray } = require('../../util/objects');

const operation = 'Converting database to launchbox';

async function convertDbToLaunchbox(
    launchboxPath,
    launchboxPlatform,
    backupPath,
    externalIdField,
    database
) {
    const progressBar = progress.getBar(operation);

    let launchboxGames = [];
    let customFields = [];
    let originalCustomFields = [];
    let originalObject;

    const LAUNCHBOX_PLATFORM_XML = `${launchboxPath}/Data/Platforms/${launchboxPlatform}.xml`;
    if (fs.existsSync(LAUNCHBOX_PLATFORM_XML)) {
        log.debug('Platform file already exists, backing up');

        fs.copyFileSync(
            LAUNCHBOX_PLATFORM_XML,
            `${backupPath}/${launchboxPlatform}-backup.xml`
        );

        log.debug('Also, read old file so we can keep ids unchanged');
        const launchboxXml = fs.readFileSync(LAUNCHBOX_PLATFORM_XML, 'utf8');
        originalObject = convert.xml2js(launchboxXml, { compact: true });
        launchboxGames = ensureArray(originalObject.LaunchBox.Game);
        originalCustomFields = ensureArray(
            originalObject.LaunchBox.CustomField
        );
    }

    const games = await database.game.Game.find({});

    const convertedGames = [];

    progressBar.start(games.length, 0);
    for (const [index, game] of games.entries()) {
        if (!game.deleted) {
            let matchingGame = launchboxGames.find(
                g => g.ID._text === game.launchboxId
            );
            const launchboxId = game.launchboxId;

            customFields.push(
                ...originalCustomFields.filter(
                    cf => cf.GameID._text === launchboxId
                )
            );

            const result = mapper.map(game);

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
                if (externalIdField === 'CustomField') {
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
    files.createMissingLaunchboxDirectories(launchboxPath, launchboxPlatform);
    fs.writeFileSync(LAUNCHBOX_PLATFORM_XML, xml);

    progress.updateName(progressBar, operation);
    progressBar.stop();
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
