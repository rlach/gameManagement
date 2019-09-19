const sinon = require('sinon');
const progress = require('../../src/util/progress');
const regedit = require('../../src/util/regedit');
const { initDatabase } = require('../../src/database/database');

const updateDpiSettings = require('../../src/scripts/update_dpi_settings');

describe('updateDpiSettings', function() {
    let progressBarUpdate;
    let database;

    beforeEach(async function() {
        database = await initDatabase({
            database: 'nedb',
            nedbExtension: '',
        });

        progressBarUpdate = sinon.spy();
        sinon.stub(progress, 'updateName');
        sinon.stub(progress, 'getBar').returns({
            start: sinon.spy(),
            update: progressBarUpdate,
            increment: sinon.spy(),
            stop: sinon.spy(),
        });
    });

    afterEach(async function() {
        sinon.verifyAndRestore();
    });

    it('Does not do anything when not on windows', async function() {
        sinon.stub(process, 'platform').value('linux');
        const findSpy = sinon.spy(database.game, 'find');
        await updateDpiSettings(database, true);
        sinon.assert.notCalled(findSpy);
    });

    it('Does not do anything when on windows but disabled', async function() {
        sinon.stub(process, 'platform').value('win32');
        const findSpy = sinon.spy(database.game, 'find');
        await updateDpiSettings(database, false);
        sinon.assert.notCalled(findSpy);
    });

    describe('on windows when enabled', function() {
        let listSpy;
        let setSpy;

        beforeEach(async function() {
            sinon.stub(process, 'platform').value('win32');
            listSpy = sinon.stub(regedit, 'list');
            setSpy = sinon.stub(regedit, 'set');
        });

        it('does not do anything when no games have exe files', async function() {
            const findSpy = sinon.spy(database.game, 'find');
            await updateDpiSettings(database, {
                updateDpi: true,
                overrides: {},
            });
            sinon.assert.calledOnce(findSpy);
            sinon.assert.notCalled(listSpy);
        });

        it('updates dpi settings for game that does not have any', async function() {
            listSpy.returns({});
            const findSpy = sinon.stub(database.game, 'find').returns([
                {
                    id: '1',
                    executableFile: 'abc.exe',
                },
            ]);
            await updateDpiSettings(database, {
                updateDpi: true,
                overrides: {},
            });
            sinon.assert.calledOnce(findSpy);
            sinon.assert.calledWithExactly(
                listSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers'
            );
            sinon.assert.calledWithExactly(
                setSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
                'abc.exe',
                '~ GDIDPISCALING DPIUNAWARE',
                'REG_SZ'
            );
        });

        it('overrides dpi settings for game based on engine', async function() {
            listSpy.returns({});
            const findSpy = sinon.stub(database.game, 'find').returns([
                {
                    engine: 'overriddenEngineApplication',
                    id: '1',
                    executableFile: 'abc.exe',
                },
                {
                    engine: 'overriddenEngineSystem',
                    id: '2',
                    executableFile: 'abcd.exe',
                },
                {
                    engine: 'overriddenEngineSystemEnhanced',
                    id: '3',
                    executableFile: 'abcde.exe',
                },
            ]);
            await updateDpiSettings(database, {
                updateDpi: true,
                overrides: {
                    overriddenEngineApplication: 1,
                    overriddenEngineSystem: 2,
                    overriddenEngineSystemEnhanced: 3,
                },
            });
            sinon.assert.calledOnce(findSpy);
            sinon.assert.calledWithExactly(
                listSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers'
            );
            sinon.assert.calledThrice(setSpy);
            sinon.assert.calledWithExactly(
                setSpy.firstCall,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
                'abc.exe',
                '~ HIGHDPIAWARE',
                'REG_SZ'
            );
            sinon.assert.calledWithExactly(
                setSpy.secondCall,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
                'abcd.exe',
                '~ DPIUNAWARE',
                'REG_SZ'
            );
            sinon.assert.calledWithExactly(
                setSpy.thirdCall,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
                'abcde.exe',
                '~ GDIDPISCALING DPIUNAWARE',
                'REG_SZ'
            );
        });

        it('does not update if all games have dpi settings', async function() {
            listSpy.returns({
                'abc.exe': 'whatever',
            });
            const findSpy = sinon.stub(database.game, 'find').returns([
                {
                    id: '1',
                    executableFile: 'abc.exe',
                },
            ]);
            await updateDpiSettings(database, {
                updateDpi: true,
                overrides: {},
            });
            sinon.assert.calledOnce(findSpy);
            sinon.assert.calledWithExactly(
                listSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers'
            );
            sinon.assert.notCalled(setSpy);
        });

        it('updates game even if it has dpi settings if force update is enabled', async function() {
            listSpy.returns({
                'abc.exe': 'whatever',
            });
            const findSpy = sinon.stub(database.game, 'find').returns([
                {
                    engine: 'overridden',
                    id: '1',
                    executableFile: 'abc.exe',
                },
            ]);
            await updateDpiSettings(
                database,
                {
                    updateDpi: true,
                    overrides: {
                        overridden: 2,
                    },
                },
                true
            );
            sinon.assert.calledOnce(findSpy);
            sinon.assert.calledWithExactly(
                listSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers'
            );
            sinon.assert.calledWithExactly(
                setSpy,
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
                'abc.exe',
                '~ DPIUNAWARE',
                'REG_SZ'
            );
        });
    });
});
