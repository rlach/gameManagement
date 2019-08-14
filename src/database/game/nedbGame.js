const moment = require('moment');
const DatabaseEntity = require('../databaseEntity');
const UUID = require('uuid');

function getGame(db) {
    class NedbGame extends DatabaseEntity {
        constructor() {
            super();

            this.Game = db;
        }

        async retrieveFromDb(id) {
            let game = await db.findOne({ id });
            if (!game) {
                game = await db.insert({
                    id,
                    launchboxId: UUID.v4(),
                    dateAdded: moment().format(),
                    dateModified: moment().format(),
                });
            }
            return game;
        }

        async findOne(searchQuery) {
            return db.findOne(searchQuery);
        }

        async save(game) {
            await db.update({ id: game.id }, game);
        }

        async updateMany(searchQuery, updatePayload) {
            return db.update(searchQuery, updatePayload, { multi: true });
        }
    }

    return new NedbGame();
}

module.exports = { getGame };
