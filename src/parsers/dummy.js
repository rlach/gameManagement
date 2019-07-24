class DummyStrategy {
    constructor() {
        this.name = 'dummy';
        this.pathName = 'DUMMY';
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

    shouldUse(gameId) {
        return false;
    }
}

let dummyStrategy = new DummyStrategy();
module.exports = dummyStrategy;
