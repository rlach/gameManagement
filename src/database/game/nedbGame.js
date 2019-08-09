const moment = require('moment');
const DatabaseGame = require('./databaseGame');

function getGame(db) {
    class NedbGame extends DatabaseGame {
        constructor() {
            super();

            this.Game = db;
        }

        async retrieveGameFromDb(id) {
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

        async findOne(searchQuery) {
            return db.findOne(searchQuery);
        }

        async saveGame(game) {
            await db.update({ id: game.id }, game);
        }

        async updateMany(searchQuery, updatePayload) {
            return db.update(searchQuery, updatePayload, { multi: true });
        }
    }

    return new NedbGame();
}

module.exports = { getGame };
