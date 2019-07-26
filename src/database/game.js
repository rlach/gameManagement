const {mongoose} = require('./mongoose');
const log = require('./../logger');
const moment = require('moment');

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
    directory: String
});
gameSchema.index({id: 1});

var Game = mongoose.model('Game', gameSchema);

async function createGame(gameData) {
    log.debug('Creating new game entry');
    var game = new Game(gameData);
    game.dateAdded = moment().format();
    game.dateModified = moment().format();
    return game.save();
}

async function findGame(id) {
    return Game.findOne({
        id
    }).exec();
}

async function retrieveGameFromDb(id) {
    let game = await findGame(id);
    if (!game) {
        game = await createGame({
            id
        });
    }
    return game;
}

module.exports = {Game, retrieveGameFromDb};
