const Joi = require('@hapi/joi');
const log = require('./logger');

const settingsSchema = Joi.object()
    .keys({
        launchboxPlatform: Joi.string().required(),
        paths: Joi.object().keys({
            launchbox: Joi.string()
                .uri({
                    allowRelative: true,
                })
                .required(),
            main: Joi.array()
                .min(1)
                .items(
                    Joi.string().uri({
                        allowRelative: true,
                    })
                )
                .required(),
            unsortedGames: Joi.string()
                .uri({
                    allowRelative: true,
                })
                .required(),
            targetSortFolder: Joi.string()
                .uri({
                    allowRelative: true,
                })
                .required(),
            backup: Joi.string()
                .uri({
                    allowRelative: true,
                })
                .required(),
        }),
        updateDpi: Joi.boolean().required(),
        exeSearchDepth: Joi.number()
            .min(1)
            .required(),
        executableExtensions: Joi.array()
            .min(1)
            .items(Joi.string())
            .required(),
        bannedFilenames: Joi.array()
            .min(0)
            .items(Joi.string())
            .required(),
        externalIdField: Joi.string()
            .valid(['SortTitle', 'Source', 'Status', 'CustomField'])
            .required(),
        preferredLanguage: Joi.string()
            .valid(['en', 'jp'])
            .required(),
        preferredImageSource: Joi.string()
            .valid(['en', 'jp'])
            .required(),
        downloadImages: Joi.boolean().required(),
        onlyUpdateNewer: Joi.boolean().required(),
        organizeDirectories: Joi.object()
            .keys({
                minimumScoreToAccept: Joi.number()
                    .min(0)
                    .required(),
                minimumScoreToAsk: Joi.number()
                    .min(0)
                    .required(),
                shouldAsk: Joi.boolean().required(),
                maxResultsToSuggest: Joi.number()
                    .min(0)
                    .required(),
                scores: Joi.object()
                    .keys({
                        resultExists: Joi.number()
                            .min(0)
                            .required(),
                        onlyOneResultExists: Joi.number()
                            .min(0)
                            .required(),
                        extractedDlsiteCode: Joi.number()
                            .min(0)
                            .required(),
                        matchForExtractedDlsiteCode: Joi.number()
                            .min(0)
                            .required(),
                        exactMatch: Joi.number()
                            .min(0)
                            .required(),
                        noSpaceExactMatch: Joi.number()
                            .min(0)
                            .required(),
                        noSpaceOriginalIncludesMatch: Joi.number()
                            .min(0)
                            .required(),
                        noSpaceMatchIncludesOriginal: Joi.number()
                            .min(0)
                            .required(),
                        originalIncludesMatch: Joi.number()
                            .min(0)
                            .required(),
                        matchIncludesOriginal: Joi.number()
                            .min(0)
                            .required(),
                    })
                    .required(),
            })
            .required()
            .unknown(true),
        logLevel: Joi.string()
            .valid(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
            .required(),
        database: Joi.object()
            .required()
            .keys({
                database: Joi.string()
                    .valid(['nedb', 'mongodb'])
                    .required(),
                nedbExtension: Joi.string()
                    .required()
                    .empty(),
                mongoUri: Joi.string()
                    .uri()
                    .required(),
            }),
    })
    .unknown(true);

function validate(settings) {
    const result = settingsSchema.validate(settings).error;
    if (result) {
        log.info(
            `There were problems with configuration file: ${result.message}\nDetails:`
        );
        result.details.forEach(d => {
            log.info(d.message);
        });
        log.info('Fix the issues and run program again');
        process.exit(1);
    }
}

module.exports = { validate };
