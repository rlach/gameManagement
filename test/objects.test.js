const objects = require('../src/objects');

const expect = require('expect.js')

describe('objects.js', function() {
    describe('removeUndefined', function() {
        it('should return unchanged object when is has no fields', function() {
            expect(objects.removeUndefined({})).to.eql({});
        });

        it('should return unchanged object when everything is defined', function() {
            const fullyDefinedObject = {
                a: 1,
                b: '1',
                c: true,
                d: false,
                e: 0,
                f: null
            };
            expect(objects.removeUndefined(fullyDefinedObject)).to.eql(fullyDefinedObject);
        });

        it('should return only defined fields when object has also undefined ones', function() {
            const fullyDefinedObject = {
                a: 1,
                b: '1',
                c: true,
                d: false,
                e: 0
            };
            expect(objects.removeUndefined({
                ...fullyDefinedObject,
                g: undefined
            })).to.eql(fullyDefinedObject);
        });
    });
});