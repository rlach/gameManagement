/* istanbul ignore file */
/* eslint-disable no-unused-vars */
class DatabaseEntity {
    async retrieveFromDb(id) {
        throw new Error('Not implemented!');
    }

    async findOne(searchQuery) {
        throw new Error('Not implemented!');
    }

    async save(image) {
        throw new Error('Not implemented!');
    }

    async updateMany(searchQuery, updatePayload) {
        throw new Error('Not implemented!');
    }

    async find(searchQuery) {
        throw new Error('Not implemented!');
    }
}

module.exports = DatabaseEntity;
