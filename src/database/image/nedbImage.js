const DatabaseEntity = require('../databaseEntity');

function getImage(db) {
    class NedbImage extends DatabaseEntity {
        constructor() {
            super();

            this.Image = db;
        }

        async findOne(searchQuery) {
            return db.findOne(searchQuery);
        }

        async save(image) {
            if (!image._id) {
                await db.insert(image);
            } else {
                await db.update({ _id: image._id }, image);
            }
        }

        async updateMany(searchQuery, updatePayload) {
            return db.update(searchQuery, updatePayload, { multi: true });
        }

        async find(searchQuery) {
            return db.find(searchQuery);
        }
    }

    return new NedbImage();
}

module.exports = { getImage };
