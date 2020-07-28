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

  describe('isObjectStrict', () => {
    context('Data is a json object', () => {
      it('returns true', () => {
        expect(Datatypes.isObjectStrict({})).to.be.true;
      });
    });

    context('Data is not a json object', () => {
      it('returns false for null', () => {
        expect(Datatypes.isObjectStrict(null)).to.be.false;
      });
      it('returns false for an array', () => {
        expect(Datatypes.isObjectStrict([])).to.be.false;
      });
      it('returns false for a buffer', () => {
        expect(Datatypes.isObjectStrict(Buffer.from('test'))).to.be.false;
      });
      it('returns false for undefined', () => {
        expect(Datatypes.isObjectStrict(undefined)).to.be.false;
      });
      it('returns false for a number', () => {
        expect(Datatypes.isObjectStrict(1)).to.be.false;
      });
      it('returns false for a string', () => {
        expect(Datatypes.isObjectStrict('test')).to.be.false;
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

  describe('isBuffer', () => {
    context('Data is a buffer', () => {
      it('returns true', () => {
        expect(Datatypes.isBuffer(Buffer.from('test'))).to.be.true;
      });
    });

    context('Data is not a buffer', () => {
      it('returns false', () => {
        expect(Datatypes.isBuffer(1)).to.be.false;
      });
    });
  });

  describe('ensureString', () => {
    context('data is null', () => {
      it('returns stringified null', () => {
        expect(Datatypes.ensureString(null)).to.equal(JSON.stringify(null));
      });
    });
    context('data is a string already', () => {
      context('With whitespace', () => {
        const whitespaceString = 'trailing    whitespace    ';
        it('Trims the whitespace', () => {
          expect(Datatypes.ensureString(whitespaceString)).to.equal(
            whitespaceString.trim()
          );
        });
      });

      context('Without trailing whitespace', () => {
        const noWhitespaceString = 'no extra space';
        it('Preserves the string', () => {
          expect(Datatypes.ensureString(noWhitespaceString)).to.equal(
            noWhitespaceString
          );
        });
      });
    });

    context('data is a bigint', () => {
      it('returns the stringified bigint', () => {
        expect(Datatypes.ensureString(1n)).to.deep.equal(1n.toString());
      });
    });

    context('data is a function', () => {
      const testFn = () => {};
      it('returns the function stringified', () => {
        expect(Datatypes.ensureString(testFn)).to.deep.equal(testFn.toString());
      });
    });

    context('data is a buffer', () => {
      const buffer = Buffer.from('test buffer');
      it('returns the buffer stringified', () => {
        expect(Datatypes.ensureString(buffer)).to.equal(buffer.toString());
      });
    });

    context('data is undefined', () => {
      it('returns undefined', () => {
        expect(Datatypes.ensureString(undefined)).to.equal(undefined);
      });
    });
  });

  describe('utf8ToBase64Url', () => {
    const testString = 'test me boi';
    it('Base64 url encodes the string', () => {
      const base64Url = Datatypes.utf8ToBase64Url(testString);
      expect(base64Url).to.not.contain('+');
      expect(base64Url).to.not.contain('/');
      expect(base64Url).to.match(/[a-zA-Z0-9-_=]/);
      const decoded = Buffer.from(base64Url, 'base64').toString('utf8');
      expect(decoded).to.equal(testString);
    });
  });

  describe('isEncryptable', () => {
    it('number is encryptable', () => {
      expect(Datatypes.isEncryptable(1)).to.be.true;
    });

    it('undefined isnt encryptable', () => {
      expect(Datatypes.isEncryptable(undefined)).to.be.false;
    });

    it('object isnt encryptable', () => {
      expect(Datatypes.isEncryptable({})).to.be.false;
    });
  });

  describe('getHeaderType', () => {
    it('undefined objects return nothing', () => {
      expect(Datatypes.getHeaderType(undefined)).to.be.undefined;
    });

    it('array returns "Array"', () => {
      expect(Datatypes.getHeaderType([1, 2, 3])).to.equal('Array');
    });

    it('number returns "number"', () => {
      expect(Datatypes.getHeaderType(1)).to.equal('number');
    });

    it('string returns "string"', () => {
      expect(Datatypes.getHeaderType('test')).to.equal('string');
    });
  });
});
