const log = require('./../logger');
const files = require('../files');
const settings = require('../settings');

class SiteStrategy {
    constructor(name) {
        this.name = name;
    }

    async fetchGameData(gameId, game) {
        log.debug(`No override for fetchGameDate on ${gameId}`);
        return;
    }

    extractCode(name) {
        log.debug(`No override for extractCode on ${name}`);
        return '';
    }

    async findGame(name) {
        log.debug(`No override for findGame on ${name}`);
        return [];
    }

    async getAdditionalImages(gameId) {
        log.debug(`No override for getAdditionalImages on ${gameId}`);
        return undefined;
    }

    scoreCodes(codes, originalFilename) {
        const results = [];

        // Points for existing
        codes.foundCodes.forEach(code => {
            this.addToCodeScore(results, settings.advanced.scores.resultExists, code.workno, code.work_name);
        });

        // Points for being the only result
        if (codes.foundCodes.length === 1) {
            this.addToCodeScore(
                results,
                settings.advanced.scores.onlyOneResultExists,
                codes.foundCodes[0].workno,
                codes.foundCodes[0].work_name
            );
        }

        const strippedOriginal = files.removeTagsAndMetadata(originalFilename).toLowerCase();
        const noSpacesOriginal = strippedOriginal.replace(/ /gi, '');

        codes.foundCodes.forEach(code => {
            const lowerCaseFoundName = code.work_name.toLowerCase();
            const noSpacesFoundName = lowerCaseFoundName.replace(/ /gi, '');

            // Points for exact match
            if (lowerCaseFoundName === strippedOriginal) {
                this.addToCodeScore(results, settings.advanced.scores.exactMatch, code.workno, code.work_name);
            }

            // Points for code name including original name
            if (lowerCaseFoundName.includes(strippedOriginal)) {
                this.addToCodeScore(results, settings.advanced.scores.similarMatch, code.workno, code.work_name);
            }

            // Points for original name including code name
            if (strippedOriginal.includes(lowerCaseFoundName)) {
                this.addToCodeScore(
                    results,
                    settings.advanced.scores.similarMatchSecondSide,
                    code.workno,
                    code.work_name
                );
            }

            // Points for exact match without spaces
            if (noSpacesFoundName === noSpacesOriginal) {
                this.addToCodeScore(results, settings.advanced.scores.noSpaceExactMatch, code.workno, code.work_name);
            }

            // Points for no space code name including no space original name
            if (noSpacesFoundName.includes(noSpacesOriginal)) {
                this.addToCodeScore(results, settings.advanced.scores.similarMatch, code.workno, code.work_name);
            }

            // Points for no space original name including no space code name
            if (noSpacesOriginal.includes(noSpacesFoundName)) {
                this.addToCodeScore(results, settings.advanced.scores.similarMatch, code.workno, code.work_name);
            }
        });

        return results;
    }

    shouldUse(gameId) {
        log.debug(`No override for shouldUse on ${gameId}`);
        return false;
    }

    addToCodeScore(codes, score, code, name) {
        const matchingCode = codes.find(c => c.code === code);
        if (matchingCode) {
            matchingCode.score += score;
            if (!matchingCode.name && name) {
                matchingCode.name = name;
            }
        } else {
            codes.push({
                code,
                score,
                name,
                strategy: this.name
            });
        }
    }
}

module.exports = SiteStrategy;
