const { expect } = require('chai');

// require root of directory - package json should resolve to dist/cjs
const prepareSdkImport = (...args) => () => require('../')(...args);

describe('Initialising the sdk', () => {
  context('No api key provided', () => {
    it('throws an error', () => {
      expect(prepareSdkImport()).to.throw();
    });
  });

  context('An object is provided instead of an api key', () => {
    it('throws an error', () => {
      expect(prepareSdkImport({})).to.throw();
    });
  });

  context('An api key is provided', () => {
    it('returns an sdk object', () => {
      const sdk = require('../')('my-api-key');
      expect(sdk.encrypt).to.be.a('function');
      expect(sdk.run).to.be.a('function');
    });
  });
});
