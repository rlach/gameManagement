/* eslint-disable no-unused-vars */
const ScoreManager = require('../util/score_manager');
const jsonDiff = require('json-diff');

class SiteStrategy {
    constructor(name, settings) {
        this.name = name;
        this.settings = settings;
        const scoreManager = new ScoreManager();
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.resultExists,
            () => {
                return true;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.onlyOneResultExists,
            (names, foundCodes) => {
                return foundCodes.length === 1;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.exactMatch,
            names => {
                return names.lowerCaseFoundName === names.strippedOriginal;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.similarMatch,
            names => {
                return names.lowerCaseFoundName.includes(
                    names.strippedOriginal
                );
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.similarMatchSecondSide,
            names => {
                return names.lowerCaseFoundName.includes(
                    names.strippedOriginal
                );
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.noSpaceExactMatch,
            names => {
                return names.noSpacesFoundName === names.noSpacesOriginal;
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.noSpaceSimilarMatch,
            names => {
                return names.noSpacesFoundName.includes(names.noSpacesOriginal);
            }
        );
        scoreManager.addFoundCodesRule(
            this.settings.advanced.scores.noSpaceSimilarMatchSecondSide,
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

    async selfTest() {
        return [];
    }

    test(description, actual, expected) {
        const result = jsonDiff.diffString(actual, expected);

        return {
            strategy: this.name,
            description,
            passes: result.length === 0,
            diff: result,
        };
    }
}

module.exports = SiteStrategy;
