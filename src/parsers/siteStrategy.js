/* eslint-disable no-unused-vars */
const ScoreManager = require('../util/score_manager');
const jsonDiff = require('json-diff');

class SiteStrategy {
    constructor(name, settings) {
        this.name = name;
        this.settings = settings;
        const scoreManager = new ScoreManager();
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.resultExists,
            () => {
                return true;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.onlyOneResultExists,
            (names, foundCodes) => {
                return foundCodes.length === 1;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.exactMatch,
            names => {
                return names.lowerCaseFoundName === names.strippedOriginal;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.matchIncludesOriginal,
            names => {
                return names.lowerCaseFoundName.includes(
                    names.strippedOriginal
                );
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.originalIncludesMatch,
            names => {
                return names.strippedOriginal.includes(
                    names.lowerCaseFoundName
                );
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores.noSpaceExactMatch,
            names => {
                return names.noSpacesFoundName === names.noSpacesOriginal;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores
                .noSpaceMatchIncludesOriginal,
            names => {
                return names.noSpacesFoundName.includes(names.noSpacesOriginal);
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.organizeDirectories.scores
                .noSpaceIncludesContainsMatch,
            names => {
                return names.noSpacesOriginal.includes(names.noSpacesFoundName);
            }
        );
        this.scoreManager = scoreManager;
    }

    async fetchGameData(gameId, game, path) {
        return {};
    }

    extractCode(name) {
        return '';
    }

    async findGame(name) {
        return [];
    }

    async getAdditionalImages(id) {
        return undefined;
    }

    scoreCodes(codes, originalFilename) {
        return this.scoreManager.scoreCodes(codes, this.name, originalFilename);
    }

    shouldUse(gameId) {
        return false;
    }

    /* istanbul ignore next */
    async selfTest() {
        return [];
    }

    test(description, actual, expected, fieldName) {
        let orderedActual = orderArrays(JSON.parse(JSON.stringify(actual)));
        let orderedExpected = orderArrays(JSON.parse(JSON.stringify(expected)));

        const result = jsonDiff.diffString(orderedExpected, orderedActual);

        return {
            strategy: this.name,
            description,
            passes: result.length === 0,
            diff: result,
            fieldName,
            actual,
        };
    }
}

function orderArrays(game) {
    const result = {
        ...game,
    };

    result.tagsEn = game.tagsEn ? game.tagsEn.sort() : undefined;
    result.tagsJp = game.tagsJp ? game.tagsJp.sort() : undefined;

    result.genresEn = game.genresEn ? game.genresEn.sort() : undefined;
    result.genresJp = game.genresJp ? game.genresJp.sort() : undefined;

    result.additionalImages = game.additionalImages
        ? game.additionalImages.sort()
        : undefined;

    return result;
}

module.exports = SiteStrategy;
