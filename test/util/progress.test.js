const progress = require('../../src/util/progress');

const { expect } = require('chai');

describe('progress', function() {
    it('returns default name when called without operation', async function() {
        let bar = progress.getBar();
        expect(bar.format).to.include('Progress');
    });

    it('returns bar with selected name', async function() {
        let bar = progress.getBar('testName');
        expect(bar.format).to.include('testName');
    });

    it('recycles the progress bar when getting second copy', async function() {
        let bar = progress.getBar('testName');
        progress.getBar('secondName');
        expect(bar.format).not.to.include('testName');
        expect(bar.format).to.include('secondName');
    });

    it('updates existing bar name', async function() {
        let bar = progress.getBar('testName');
        progress.updateName('updatedName');
        expect(bar.format).not.to.include('testName');
        expect(bar.format).to.include('updatedName');
    });
});
