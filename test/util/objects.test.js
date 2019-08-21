const objects = require('../../src/util/objects');

const { expect } = require('chai');

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
                f: null,
            };
            expect(objects.removeUndefined(fullyDefinedObject)).to.eql(
                fullyDefinedObject
            );
        });

        it('should return only defined fields when object has also undefined ones', function() {
            const fullyDefinedObject = {
                a: 1,
                b: '1',
                c: true,
                d: false,
                e: 0,
            };
            expect(
                objects.removeUndefined({
                    ...fullyDefinedObject,
                    g: undefined,
                })
            ).to.eql(fullyDefinedObject);
        });
    });

    describe('ensure array', function() {
        it('returns empty array when undefined is passed', async function() {
            expect(objects.ensureArray(undefined)).to.eql([]);
        });

        it('returns single element array when object is passed', async function() {
            expect(objects.ensureArray({ id: 1 })).to.eql([{ id: 1 }]);
        });

        it('returns passed array with no change', async function() {
            const array = [{ id: 1 }, { id: 2 }];
            expect(objects.ensureArray(array)).to.eql(array);
        });
    });
});
