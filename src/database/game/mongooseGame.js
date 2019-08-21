/* istanbul ignore file */
const moment = require('moment');
const DatabaseEntity = require('../databaseEntity');
const UUID = require('uuid');

function getGame(mongoose) {
    const gameSchema = new mongoose.Schema({
        id: String,
        source: String,
        nameEn: String,
        nameJp: String,
        sortName: String,
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
        lastPlayedDate: String,
        playCount: Number,
        favorite: Boolean,
        rating: Number,
        stars: Number,
        status: String,
        communityStars: Number,
        communityStarVotes: Number,
        version: String,
        series: String,
        launchboxId: String,
        portable: Boolean,
        hide: Boolean,
        broken: Boolean,
        deleted: Boolean,
        executableFile: String,
        directory: String,
        additionalImages: [String],
        forceSourceUpdate: Boolean,
        forceExecutableUpdate: Boolean,
        forceAdditionalImagesUpdate: Boolean,
        engine: String,
        sourceMissingEn: Boolean,
        sourceMissingJp: Boolean,
    });
    gameSchema.index({ id: 1 });

    class MongooseGame extends DatabaseEntity {
        constructor() {
            super();

            this.name = 'mongodb';
            this.Game = mongoose.model('Game', gameSchema);
        }

        async retrieveFromDb(id) {
            let game = await this.findOne({ id });
            if (!game) {
                game = await this.createGame({
                    id,
                    launchboxId: UUID.v4(),
                    portable: true,
                });
            }
            return game;
        }

        async findOne(searchQuery) {
            return this.Game.findOne(searchQuery);
        }

        async save(game) {
            game.dateModified = moment().format();
            return game.save();
        }

        async updateMany(searchQuery, updatePayload) {
            return this.Game.updateMany(searchQuery, updatePayload).exec();
        }

        async createGame(gameData) {
            const game = new this.Game(gameData);
            game.dateAdded = moment().format();
            game.dateModified = moment().format();
            return this.save(game);
        }

        async find(searchQuery) {
            return this.Game.find(searchQuery).exec();
        }
    }

    return new MongooseGame();
}

module.exports = { getGame };
