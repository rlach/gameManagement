const ObjectMapper = require('two-way-object-mapper');
const settings = require('./settings');
const moment = require('moment');

const mapper = new ObjectMapper();
mapper
    .addPropertyMapping(booleanProperty('completed', 'Completed'))
    .addPropertyMapping(dateProperty('dateAdded', 'DateAdded'))
    .addPropertyMapping(dateProperty('dateModified', 'DateModified'))
    .addPropertyMapping(dateProperty('releaseDate', 'ReleaseDate'))
    .addPropertyMapping(
        dateProperty('lastPlayedDate', 'LastPlayedDate', '1800-01-01')
    )
    .addPropertyMapping(booleanProperty('favorite', 'Favorite'))
    .addPropertyMapping(integerProperty('rating', 'Rating'))
    .addPropertyMapping(integerProperty('playCount', 'PlayCount'))
    .addPropertyMapping(floatProperty('stars', 'StarRatingFloat'))
    .addPropertyMapping(floatProperty('communityStars', 'CommunityStarRating'))
    .addPropertyMapping(
        integerProperty('communityStarVotes', 'CommunityStarRatingTotalVotes')
    )
    .addPropertyMapping(simpleProperty('version', 'Version'))
    .addPropertyMapping(simpleProperty('series', 'Series'))
    .addPropertyMapping(simpleProperty('launchboxId', 'ID'))
    .addPropertyMapping(booleanProperty('portable', 'Portable'))
    .addPropertyMapping(booleanProperty('hide', 'Hide'))
    .addPropertyMapping(booleanProperty('broken', 'Broken'))
    .addPropertyMapping(simpleProperty('executableFile', 'ApplicationPath'))
    .addPropertyMapping(simpleProperty('directory', 'RootFolder'))
    .addMapping(function(source, target) {
        target.StarRating = integerTransform(source.stars);
        target.Platform = simpleTransform(settings.launchboxPlatform);
        return target;
    });

languageDependentSimpleProperty(mapper, 'name', 'Title');
languageDependentSimpleProperty(mapper, 'description', 'Notes');
languageDependentSimpleProperty(mapper, 'maker', 'Developer');
languageDependentArrayProperty(mapper, 'genres', 'Genre');

switch (settings.externalIdField) {
    case 'Status':
        mapper
            .addPropertyMapping(simpleProperty('id', 'Status'))
            .addPropertyMapping(simpleProperty('source', 'Source'))
            .addPropertyMapping(simpleProperty('sortName', 'SortTitle'));
        break;
    case 'SortTitle':
        mapper
            .addPropertyMapping(simpleProperty('status', 'Status'))
            .addPropertyMapping(simpleProperty('source', 'Source'))
            .addPropertyMapping(simpleProperty('id', 'SortTitle'));
        break;
    case 'Source':
        mapper
            .addPropertyMapping(simpleProperty('status', 'Status'))
            .addPropertyMapping(simpleProperty('id', 'Source'))
            .addPropertyMapping(simpleProperty('sortName', 'SortTitle'));
        break;
    case 'CustomField':
    default:
        mapper
            .addPropertyMapping(simpleProperty('status', 'Status'))
            .addPropertyMapping(simpleProperty('source', 'Source'))
            .addPropertyMapping(simpleProperty('sortName', 'SortTitle'));
    // ExternalId set separately in custom fields
}

function languageDependentSimpleProperty(mapper, from, to) {
    const baseFrom =
        settings.preferredLanguage === 'en' ? `${from}En` : `${from}Jp`;
    const backupFrom =
        settings.preferredLanguage === 'en' ? `${from}Jp` : `${from}En`;
    mapper.addMapping(function(source, target) {
        const sourceValue = source[baseFrom]
            ? source[baseFrom]
            : source[backupFrom];
        target[to] = simpleTransform(sourceValue);
        return target;
    });
    mapper.addReverseMapping(function(source, target) {
        target[baseFrom] = source[to] ? source[to]._text : '';
        return target;
    });
}

function languageDependentArrayProperty(mapper, from, to, split = ';') {
    const baseFrom =
        settings.preferredLanguage === 'en' ? `${from}En` : `${from}Jp`;
    const backupFrom =
        settings.preferredLanguage === 'en' ? `${from}Jp` : `${from}En`;
    mapper.addMapping(function(source, target) {
        const sourceValue = source[baseFrom]
            ? source[baseFrom]
            : source[backupFrom];
        target[to] = arrayTransform(sourceValue, split);
        return target;
    });
    mapper.addReverseMapping(function(source, target) {
        target[baseFrom] = arrayReverseTransform(source[to], split);
        return target;
    });
}

function arrayReverseTransform(value, split) {
    return value._text ? value._text.split(split) : [];
}

function arrayTransform(value, split) {
    return {
        _text: value ? value.join(split) : '',
    };
}

function simpleProperty(from, to) {
    return {
        from: from,
        to: to,
        reverseTransform: function(value) {
            return value._text;
        },
        transform: simpleTransform,
        default: {},
    };
}

function simpleTransform(value) {
    return {
        _text: value ? value.replace(invalidChars, '') : '',
    };
}

function floatProperty(from, to) {
    return {
        from: from,
        to: to,
        reverseTransform: function(value) {
            return Number.parseFloat(value._text);
        },
        transform: function(value) {
            return {
                _text: value,
            };
        },
        default: {
            _text: 0,
        },
    };
}

function integerProperty(from, to) {
    return {
        from: from,
        to: to,
        reverseTransform: function(value) {
            return value._text ? Number.parseInt(value._text) : undefined;
        },
        transform: integerTransform,
        default: {
            _text: 0,
        },
    };
}

function integerTransform(value) {
    return {
        _text: value ? Math.floor(value) : 0,
    };
}

function dateProperty(from, to, defaultDate) {
    return {
        from: from,
        to: to,
        reverseTransform: function(value) {
            return value._text;
        },
        transform: function(value) {
            return {
                _text: value ? value : moment().format(),
            };
        },
        default: {
            _text: defaultDate
                ? moment(defaultDate, 'YYYY-MM-DD').format()
                : moment().format(),
        },
    };
}

function booleanProperty(from, to) {
    return {
        from: from,
        to: to,
        reverseTransform: function(value) {
            return value._text === 'true';
        },
        transform: function(value) {
            return {
                _text: value ? value : 'false',
            };
        },
        default: {
            _text: 'false',
        },
    };
}

// remove everything forbidden by XML 1.0 specifications, plus the unicode replacement character U+FFFD
const invalidChars = /([^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFC\u{10000}-\u{10FFFF}])/gu;

module.exports = mapper;
