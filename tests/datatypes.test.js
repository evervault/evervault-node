const { expect } = require('chai');
const Datatypes = require('../lib/utils/datatypes');

describe('Datatypes', () => {
  describe('isArray', () => {
    context('Data is an array', () => {
      it('returns true', () => {
        expect(Datatypes.isArray([])).to.be.true;
      });
    });

    context('Data is not an array', () => {
      it('returns false', () => {
        expect(Datatypes.isArray(0)).to.be.false;
      });
    });
  });

  describe('isObject', () => {
    context('Data is an object', () => {
      it('returns true for json object', () => {
        expect(Datatypes.isObject({})).to.be.true;
      });
      it('returns true for null', () => {
        expect(Datatypes.isObject(null)).to.be.true;
      });
      it('returns true for array', () => {
        expect(Datatypes.isObject([])).to.be.true;
      });
      it('returns true for a buffer', () => {
        expect(Datatypes.isObject(Buffer.from('test'))).to.be.true;
      });
    });

    context('Data is not an object', () => {
      it('returns false for undefined', () => {
        expect(Datatypes.isObject(undefined)).to.be.false;
      });
      it('returns false for a number', () => {
        expect(Datatypes.isObject(1)).to.be.false;
      });
      it('returns false for a string', () => {
        expect(Datatypes.isObject('test')).to.be.false;
      });
    });
  });

  describe('isString', () => {
    context('Data is a string', () => {
      it('returns true', () => {
        expect(Datatypes.isString('test')).to.be.true;
      });
    });

    context('Data is not a string', () => {
      it('returns false', () => {
        expect(Datatypes.isString(1)).to.be.false;
      });
    });
  });

  describe('isDefined', () => {
    context('Data is defined', () => {
      it('returns true', () => {
        expect(Datatypes.isDefined(1)).to.be.true;
      });
    });

    context('Data is not defined', () => {
      it('returns false for null', () => {
        expect(Datatypes.isDefined(null)).to.be.false;
      });
      it('returns false for undefined', () => {
        expect(Datatypes.isDefined(undefined)).to.be.false;
      });
    });
  });

  describe('isUndefined', () => {
    context('Data is undefined', () => {
      it('returns true', () => {
        expect(Datatypes.isUndefined(undefined)).to.be.true;
      });
    });

    context('Data is not undefined', () => {
      it('returns false', () => {
        expect(Datatypes.isUndefined(1)).to.be.false;
      });
    });
  });
});
