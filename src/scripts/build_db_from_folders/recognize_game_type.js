const { promisify } = require('util');

const find = require('fs-find');
const fs = require('fs');
const asyncFind = promisify(find);
const settings = require('../../settings');
const { recognizers, allRules } = require('./recognizers');

async function recognizeGameType(file) {
    const basePath = `${file.path}/${file.name}`;
    const subdirectories = fs
        .readdirSync(basePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    if (subdirectories.length === 0) {
        return;
    }

    const versionPath = `${basePath}/${subdirectories[0]}`;

    const gameRelatedFiles = await getFilesRelatedToEngine(versionPath);

    return recognizeGame(gameRelatedFiles, recognizers);
}

function recognizeGame(gameRelatedFiles, recognizers) {
    if (gameRelatedFiles.length > 0) {
        const recognizer = recognizers.find(r => {
            if (r.customValidator) {
                return r.customValidator(gameRelatedFiles, r);
            } else {
                return standardValidator(gameRelatedFiles, r);
            }
        });

        if (recognizer) {
            return recognizer.engine;
        }
    }
}

async function getFilesRelatedToEngine(versionPath) {
    return asyncFind(versionPath, {
        file: (_, f) => {
            const matcher = f.matcher.toLowerCase();
            return fulfillsAnyRule(allRules, matcher);
        },
        depth: Math.max(settings.exeSearchDepth, 1)
    });
}

function standardValidator(gameRelatedFiles, recognizer) {
    return gameRelatedFiles.some(f => {
        const matcher = f.name.toLowerCase();
        return fulfillsAnyRule(recognizer.rules, matcher);
    });
}

function fulfillsAnyRule(rules, matcher) {
    const startsWithAny = rules.startsWith
        ? rules.startsWith.reduce(function(returnValue, currentTest) {
              return returnValue || matcher.startsWith(currentTest);
          }, false)
        : false;
    const equalsAny = rules.equals
        ? rules.equals.reduce(function(returnValue, currentTest) {
              return returnValue || matcher === currentTest;
          }, false)
        : false;
    const endsWithAny = rules.endsWith
        ? rules.endsWith.reduce(function(returnValue, currentTest) {
              return returnValue || matcher.endsWith(currentTest);
          }, false)
        : false;

    if (startsWithAny || equalsAny || endsWithAny) {
        return true;
    }
}

module.exports = recognizeGameType;
