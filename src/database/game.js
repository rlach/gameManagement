const settings = require('../settings');
const log = require('./../logger');
const moment = require('moment');

if (settings.database === 'nedb') {
    log.debug('Using nedb database');
    const { db } = require('./mongoose');

    async function retrieveGameFromDb(id) {
        let game = await db.findOne({ id });
        if (!game) {
            game = await db.insert({
                id,
                dateAdded: moment().format(),
                dateModified: moment().format()
            });
        }
        return game;
    }

    async function findOne(searchQuery) {
        return db.findOne(searchQuery);
    }

    async function saveGame(game) {
        await db.update({ id: game.id }, game);
    }

    async function updateMany(searchQuery, updatePayload) {
        return db.update(searchQuery, updatePayload, { multi: true });
    }

    const Game = db;

    module.exports = { Game, retrieveGameFromDb, saveGame, updateMany, findOne };
} else {
    log.debug('Using mongodb database');
    const { mongoose } = require('./mongoose');

    var gameSchema = new mongoose.Schema({
        id: String,
        source: String,
        nameEn: String,
        nameJp: String,
        descriptionEn: String,
        descriptionJp: String,
        genresEn: [String],
        genresJp: [String],
        tagsEn: [String],
        tagsJp: [String],
        makerEn: String,
        makerJp: String,
        imageUrlJp: String,
        imageUrlEn: String,
        completed: Boolean,
        dateAdded: String,
        dateModified: String,
        releaseDate: String,
        favorite: Boolean,
        rating: Number,
        stars: Number,
        communityStars: Number,
        communityStarVotes: Number,
        version: String,
        series: String,
        portable: Boolean,
        hide: Boolean,
        broken: Boolean,
        deleted: Boolean,
        executableFile: String,
        directory: String,
        additionalImages: [String],
        forceSourceUpdate: Boolean,
        forceExecutableUpdate: Boolean,
        forceAdditionalImagesUpdate: Boolean
    });
    gameSchema.index({ id: 1 });

    var Game = mongoose.model('Game', gameSchema);

    async function createGame(gameData) {
        log.debug('Creating new game entry');
        var game = new Game(gameData);
        game.dateAdded = moment().format();
        game.dateModified = moment().format();
        return saveGame(game);
    }

    async function findOne(searchQuery) {
        return Game.findOne(searchQuery);
    }

    async function retrieveGameFromDb(id) {
        let game = await findOne({ id });
        if (!game) {
            game = await createGame({
                id
            });
        }
        return game;
    }

    async function saveGame(game) {
        return game.save();
    }

    async function updateMany(searchQuery, updatePayload) {
        return Game.updateMany(searchQuery, updatePayload).exec();
    }

    module.exports = { Game, retrieveGameFromDb, saveGame, updateMany, findOne };
}
