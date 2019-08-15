const moment = require('moment');
const DatabaseEntity = require('../databaseEntity');
const UUID = require('uuid');

function getImage(mongoose) {
    const imageSchema = new mongoose.Schema({
        gameId: String,
        launchboxId: String,
        uri: String,
        status: String,
        type: String,
        filename: String,
    });

    class MongooseImage extends DatabaseEntity {
        constructor() {
            super();

            this.name = 'mongodb';
            this.Image = mongoose.model('Image', imageSchema);
        }

        async retrieveFromDb(id) {
            throw new Error('Not implemented');
        }

        async findOne(searchQuery) {
            return this.Image.findOne(searchQuery);
        }

        async save(imageData) {
            if (!imageData._id) {
                const image = new this.Image(imageData);
                return image.save();
            } else {
                imageData.save();
            }
        }

        async updateMany(searchQuery, updatePayload) {
            return this.Image.updateMany(searchQuery, updatePayload).exec();
        }

        async find(searchQuery) {
            return this.Image.find(searchQuery).exec();
        }
    }

    return new MongooseImage();
}

module.exports = { getImage };