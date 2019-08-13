class DatabaseEntity {
    async retrieveFromDb(id) {}

    async findOne(searchQuery) {}

    async save(entity) {}

    async updateMany(searchQuery, updatePayload) {}

    async find(searchQuery) {}
}

module.exports = DatabaseEntity;
