const {mongoose} = require('./mongoose');

var gameSchema = new mongoose.Schema({
    id: String,
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
    shortcutExists: Boolean
});
gameSchema.index({id: 1});

var Game = mongoose.model('Game', gameSchema);

async function createGame(gameData) {
    log.debug('Creating new game entry');
    var game = new Game(gameData);
    return game.save();
}

async function findGame(id) {
    return Game.findOne({
        id
    }).exec();
}

async function retrieveGame(id) {
    let game = await findGame(id);
    if (!game) {
        game = await createGame({
            id
        });
    }
    return game;
}

module.exports = {Game, retrieveGame};
