const files = require('../util/files');
const { removeUndefined } = require('./objects');

class ScoreManager {
    constructor() {
        this.rules = [];
    }

    addExtractedCodeRule(score, check) {
        this.rules.push({
            type: 'extracted',
            score,
            check,
        });
    }

    addFoundCodesRule(score, check) {
        this.rules.push({
            type: 'found',
            score,
            check,
        });
    }

    scoreCodes(codes, strategy, originalFilename) {
        let scores = [];
        this.scoreExtractedCode(scores, codes, strategy);
        this.scoreFoundCodes(
            scores,
            codes.foundCodes,
            strategy,
            originalFilename
        );
        return scores;
    }

    scoreExtractedCode(scores, codes, strategy) {
        const extractedCodeRules = this.rules.filter(
            r => r.type === 'extracted'
        );

        extractedCodeRules.forEach(rule => {
            const result = rule.check(codes.extractedCode, codes.foundCodes);
            if (result) {
                this.updateScores(
                    scores,
                    rule.score,
                    {
                        workno: codes.extractedCode,
                    },
                    strategy
                );
            }
        });
    }

    scoreFoundCodes(scores, foundCodes, strategy, originalFilename) {
        const strippedOriginal = files
            .removeTagsAndMetadata(originalFilename)
            .toLowerCase();
        const noSpacesOriginal = strippedOriginal.replace(/ /gi, '');

        const foundCodesRules = this.rules.filter(r => r.type === 'found');

        foundCodes.forEach(code => {
            const lowerCaseFoundName = code.work_name.toLowerCase();
            const noSpacesFoundName = lowerCaseFoundName.replace(/ /gi, '');

            foundCodesRules.forEach(rule => {
                const result = rule.check(
                    {
                        strippedOriginal,
                        noSpacesOriginal,
                        lowerCaseFoundName,
                        noSpacesFoundName,
                    },
                    foundCodes
                );
                if (result) {
                    this.updateScores(scores, rule.score, code, strategy);
                }
            });
        });
    }

    updateScores(codes, score, code, strategy) {
        const matchingCode = codes.find(c => c.code === code.workno);
        if (matchingCode) {
            matchingCode.score += score;
            if (!matchingCode.name && code.work_name) {
                matchingCode.name = code.work_name;
            }
        } else {
            codes.push(
                removeUndefined({
                    code: code.workno,
                    score,
                    name: code.work_name,
                    strategy: strategy,
                })
            );
        }
    }
}

module.exports = ScoreManager;
