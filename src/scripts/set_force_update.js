const inquirer = require('inquirer');
const log = require('../util/logger');
const matcher = require('matcher');
const { removeUndefined } = require('../util/objects');

inquirer.registerPrompt(
    'checkbox-plus',
    require('inquirer-checkbox-plus-prompt')
);

async function setForceUpdate(database) {
    let answers = {};
    Object.assign(
        answers,
        await inquirer.prompt({
            type: 'checkbox',
            name: 'fields',
            message: 'Select fields to force refresh',
            choices: [
                { name: 'source pages', value: 'source' },
                { name: 'executable files', value: 'executable' },
                { name: 'additional images', value: 'additionalImages' },
            ],
        })
    );

    if (answers.fields.length === 0) {
        log.info('Nothing to force');
        return;
    }
    Object.assign(
        answers,
        await inquirer.prompt({
            type: 'checkbox',
            name: 'filters',
            message:
                'Select filters for which games to force refresh(no filers = all games, all filters connected by OR)',
            choices: [
                new inquirer.Separator('= By games ='),
                { name: 'select games...', value: 'game' },
                new inquirer.Separator('= By source page ='),
                { name: 'dlsite', value: 'dlsite' },
                { name: 'getchu', value: 'getchu' },
                { name: 'dmm', value: 'dmm' },
                new inquirer.Separator('= By game ID ='),
                { name: 'starting with VJ', value: 'VJ' },
                { name: 'starting with RJ', value: 'RJ' },
            ],
        })
    );

    let searchQuery = {};

    if (answers.filters.some(f => f === 'game')) {
        const allGames = await database.game.find({});
        const choices = allGames.map(g => ({
            name: `${g.nameEn ? g.nameEn : g.nameJp} [${g.id}]`,
            value: g.id,
        }));

        Object.assign(
            answers,
            await inquirer.prompt({
                type: 'checkbox-plus',
                name: 'games',
                message:
                    'Select filters for which games to force refresh(no filers = all games, all filters connected by OR)',
                source: async (answersSoFar, input) => {
                    input = input || '';

                    const filteredChoices = choices.filter(c =>
                        matcher.isMatch(c.name, `*${input}*`, {
                            caseSensitive: false,
                        })
                    );

                    return filteredChoices;
                },
                searchable: true,
            })
        );

        if (answers.games.length === 0) {
            log.info('No games selected');
            return;
        }
    }

    const sourceFilters = answers.filters.filter(element =>
        ['dlsite', 'getchu', 'dmm'].includes(element)
    );
    const idFilters = answers.filters.filter(element =>
        ['VJ', 'RJ'].includes(element)
    );
    const gamesFilter = answers.games ? answers.games : [];

    const searchQueries = [];

    if (sourceFilters.length > 0) {
        searchQueries.push({ source: { $in: sourceFilters } });
    }

    if (idFilters.length > 0) {
        const expression = `^(${idFilters.join('|')})`;
        const regex = RegExp(expression);
        searchQueries.push({ id: { $regex: regex } });
    }

    if (gamesFilter.length > 0) {
        searchQueries.push({ id: { $in: answers.games } });
    }

    if (searchQueries.length === 1) {
        searchQuery = searchQueries[0];
    } else if (searchQueries.length > 1) {
        searchQuery.$or = searchQueries;
    }

    const updateQuery = removeUndefined({
        forceSourceUpdate: trueIfContains(answers.fields, 'source'),
        forceExecutableUpdate: trueIfContains(answers.fields, 'executable'),
        forceAdditionalImagesUpdate: trueIfContains(
            answers.fields,
            'additionalImages'
        ),
    });

    const result = await database.game.updateMany(searchQuery, {
        $set: updateQuery,
    });
    log.info('Result: ', result);
}

function trueIfContains(fields, field) {
    return fields.includes(field) ? true : undefined;
}

module.exports = setForceUpdate;
