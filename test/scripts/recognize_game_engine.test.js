const sinon = require('sinon');
const fs = require('fs');
const files = require('../../src/util/files');

const Chai = require('chai');
const ChaiPromised = require('chai-as-promised');
const { expect } = Chai;

Chai.use(ChaiPromised);

const {
    recognizeGameEngine,
} = require('../../src/scripts/build_db_from_folders/recognize_game_engine');

describe('gameManagement', function() {
    const file = {
        name: 'fileName',
        path: 'filePath',
    };

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Throws when directory does not exist', async function() {
        return expect(recognizeGameEngine(file)).to.eventually.be.rejectedWith(
            "ENOENT: no such file or directory, scandir 'filePath/fileName'"
        );
    });

    it('Returns undefined when there are no subdirectories', async function() {
        sinon.stub(fs, 'readdirSync').returns([]);
        const result = await recognizeGameEngine(file);
        expect(result).to.eql(undefined);
    });

    it('Returns undefined when there are no game related files', async function() {
        sinon.stub(fs, 'readdirSync').returns([
            {
                isDirectory: () => true,
                name: 'subdirectory',
            },
        ]);
        sinon.stub(files, 'findByFilter').returns([]);
        const result = await recognizeGameEngine(file);
        expect(result).to.eql(undefined);
    });

    describe('recognize engine', function() {
        beforeEach(async function() {
            sinon.stub(fs, 'readdirSync').returns([
                {
                    isDirectory: () => true,
                    name: 'subdirectory',
                },
            ]);
        });

        it('Returns engine when file was recognized with endsWith rule', async function() {
            stubFindFiles(['Game.noa']);
            const result = await recognizeGameEngine(file);
            expect(result).to.eql('Cotopha');
        });

        it('Returns engine when file was recognized with startsWith rule', async function() {
            stubFindFiles(['SigulusEngine.exe']);
            const result = await recognizeGameEngine(file);
            expect(result).to.eql('sigulus');
        });

        it('Returns engine when file was recognized with equals rule', async function() {
            stubFindFiles(['taskforce2.exe']);
            const result = await recognizeGameEngine(file);
            expect(result).to.eql('Taskforce2');
        });

        describe('Bruns recognizer', function() {
            it('Recognizes bruns when ams.cfg exists and other bruns file was found', async function() {
                stubFindFiles(['ams.cfg', 'anything.bso']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('bruns');
            });

            it('Does not recognize bruns if only ams.cfq was found', async function() {
                stubFindFiles(['ams.cfq']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql(undefined);
            });

            it('Does not recognize bruns if only additional bruns files were found', async function() {
                stubFindFiles(['anything.bso', 'anything.bruns']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql(undefined);
            });
        });

        describe('RPG Maker VX Ace recognizer', function() {
            it('Recognizes VX Ace if rgss3a is found', async function() {
                stubFindFiles(['somethings.rgss3a']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerAceVX');
            });

            it('Recognizes VX Ace if game.ini is found and mentions rpgvxace', async function() {
                stubFindFiles(['game.ini']);
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rpgvxace anything');
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerAceVX');
            });

            it('Does not recognize VX Ace if game.ini is found and has no mention of rpgvxace', async function() {
                stubFindFiles(['game.ini']);
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rpgmv anything');
                const result = await recognizeGameEngine(file);
                expect(result).to.eql(undefined);
            });
        });

        describe('RPG Maker MV recognizer', function() {
            it('Recognizes RPG Maker MV if game_boxed.exe is found', async function() {
                stubFindFiles(['game_boxed.exe']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerMv');
            });

            it('Recognizes RPG Maker MV if package.json is found and it mentions rpgmv', async function() {
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rpgmv anything');
                stubFindFiles(['package.json']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerMv');
            });

            it('Recognizes RPG Maker MV if package.json is a buffer', async function() {
                sinon
                    .stub(fs, 'readFileSync')
                    .returns(Buffer.from('anything rpgmv anything', 'utf8'));
                stubFindFiles(['package.json']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerMv');
            });

            it('Recognizes RPG Maker MV if package.json has no mention of rpgmv but game.exe exists', async function() {
                sinon.stub(fs, 'readFileSync').returns('anything anything');
                stubFindFiles(['package.json', 'game.exe']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerMv');
            });

            it('Recognizes RPG Maker MV if package.json has no mention of rpgmv but resources.pak exists', async function() {
                sinon.stub(fs, 'readFileSync').returns('anything anything');
                stubFindFiles(['package.json', 'resources.pak']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerMv');
            });

            it('Does not recognize RPG Maker MV if package.json has no mention of rpgmv and other related files do not exist', async function() {
                sinon.stub(fs, 'readFileSync').returns('anything anything');
                stubFindFiles([
                    'package.json',
                    'something.pak',
                    'different.exe',
                ]);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql(undefined);
            });
        });

        describe('RPG Maker VX and XP recognizer', function() {
            it('Recognizes RPG Maker XP if game.exe and game.ini are found and rxdata is mentioned in the ini', async function() {
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rxdata anything');
                stubFindFiles(['game.exe', 'game.ini']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerXP');
            });

            it('Recognizes RPG Maker VX if game.exe and game.ini are found and rvdata is mentioned in the ini', async function() {
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rvdata anything');
                stubFindFiles(['game.exe', 'game.ini']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerVX');
            });

            it('Recognizes RPG Maker VX if game.exe and game.ini are found and rpgvx is mentioned in the ini', async function() {
                sinon
                    .stub(fs, 'readFileSync')
                    .returns('anything rpgvx anything');
                stubFindFiles(['game.exe', 'game.ini']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql('rpgMakerVX');
            });

            it('Does not recognize RPG Maker VX nor XP if game.ini has no related keywords', async function() {
                sinon.stub(fs, 'readFileSync').returns('anything anything');
                stubFindFiles(['game.exe', 'game.ini']);
                const result = await recognizeGameEngine(file);
                expect(result).to.eql(undefined);
            });
        });
    });

    describe('Filter files related to engine', function() {
        beforeEach(async function() {
            sinon.stub(fs, 'readdirSync').returns([
                {
                    isDirectory: () => true,
                    name: 'subdirectory',
                },
            ]);
        });

        it('returns empty array when no file matches any rule', async function() {
            const findFilesStub = stubFindFiles(['a']);
            await recognizeGameEngine(file);
            expect(findFilesStub.firstCall.returned([])).to.eql(true);
        });

        it('returns full file object when it matched some rule', async function() {
            const findFilesStub = stubFindFiles(['Game.exe']);
            await recognizeGameEngine(file);
            expect(
                findFilesStub.firstCall.returned([
                    {
                        matcher: 'Game.exe',
                        name: 'Game.exe',
                        file: 'Game.exe',
                    },
                ])
            ).to.eql(true);
        });
    });
});

function stubFindFiles(filesToMatch) {
    let filesToMatchMapped = filesToMatch.map(f => ({
        matcher: f,
        name: f,
        file: f,
    }));
    return sinon.stub(files, 'findByFilter').callsFake((path, callback) => {
        let result = [];
        for (let v of filesToMatchMapped) {
            if (callback(v)) {
                result.push(v);
            }
        }
        return result;
    });
}
