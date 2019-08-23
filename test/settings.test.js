const sinon = require('sinon');
const { expect } = require('chai');
const fs = require('fs');

const settingsSample = require('../src/settings-sample');
const settings = require('../src/settings');

describe('settings', function() {
    afterEach(async function() {
        sinon.verifyAndRestore();
        settings.settings = undefined;
    });

    it('returns sample settings if sample file does not exist', async function() {
        sinon.stub(fs, 'existsSync').returns(false);
        const result = settings.getSettings();
        expect(result).to.eql(settingsSample);
    });

    it('changes fields in sample settings to ones found in local file', async function() {
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns('{"logLevel": "debug"}');
        const result = settings.getSettings();
        expect(result).to.eql({ ...settingsSample, logLevel: 'debug' });
    });

    it('reuses the object on second call', async function() {
        sinon.stub(fs, 'existsSync').returns(true);
        const readFileStub = sinon
            .stub(fs, 'readFileSync')
            .onFirstCall()
            .returns('{"logLevel": "debug"}');
        settings.getSettings();
        const result = settings.getSettings();
        expect(result).to.eql({ ...settingsSample, logLevel: 'debug' });
        sinon.assert.calledOnce(readFileStub);
    });
});
