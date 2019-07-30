class DummyStrategy {
    constructor() {
        this.name = 'dummy';
    }

    async fetchGameData(gameId) {
        return;
    }

    extractCode(name) {
        return name;
    }

    async findGame(name) {
        return [];
    }

    async getAdditionalImages(id) {
        return undefined;
    }

    shouldUse(gameId) {
        return false;
    }
}

let dummyStrategy = new DummyStrategy();
module.exports = dummyStrategy;
