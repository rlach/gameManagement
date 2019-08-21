const inquirer = require('inquirer');
const log = require('../util/logger');
const matcher = require('matcher');

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
                new inquirer.Separator('= Other (overwrites other choices) ='),
                { name: 'select concrete games', value: 'game' },
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

    log.debug('answers', answers);

    if (answers.filters.some(f => f === 'game')) {
        const allGames = await database.game.find({});
        const choices = allGames.map(g => ({
            name: `${g.nameEn ? g.nameEn : g.nameJp} [${g.id}]`,
            value: g.id,
        }));

        log.info('chosen game');
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
        } else {
            searchQuery.id = { $in: answers.games };
        }

        log.info('Games selected', answers.games);
    } else {
        const sources = answers.filters.filter(element =>
            ['dlsite', 'getchu', 'dmm'].includes(element)
        );
        const idFilters = answers.filters.filter(element =>
            ['VJ', 'RJ'].includes(element)
        );
        if (idFilters.length > 0 || sources.length > 0) {
            searchQuery['$or'] = [];
        }

        if (sources.length > 0) {
            searchQuery.$or.push({ source: { $in: sources } });
        }

        if (idFilters.length > 0) {
            const expression = `^(${idFilters.join('|')})`;
            const regex = RegExp(expression);
            searchQuery.$or.push({ id: { $regex: regex } });
        }
    }

    log.debug('query', JSON.stringify(searchQuery));

    const updateQuery = {
        forceSourceUpdate: answers.fields.includes('source'),
        forceExecutableUpdate: answers.fields.includes('executable'),
        forceAdditionalImagesUpdate: answers.fields.includes(
            'additionalImages'
        ),
    };

    const result = await database.game.updateMany(searchQuery, {
        $set: updateQuery,
    });
    log.info('Result: ', result);
}

module.exports = setForceUpdate;
