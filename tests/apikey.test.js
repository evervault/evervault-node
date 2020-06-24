const { expect } = require('chai');
const { init, errors } = require('../lib');

const prepareSdkImport = (...args) => () => init(...args);

describe('Initialising the sdk', () => {
  context('No api key provided', () => {
    it('throws an error', () => {
      expect(prepareSdkImport()).to.throw(errors.ApiKeyError);
    });
  });

  context('An object is provided instead of an api key', () => {
    it('throws an error', () => {
      expect(prepareSdkImport({})).to.throw(errors.ApiKeyError);
    });
  });

  context('An api key is provided', () => {
    it('returns an sdk object', () => {
      const sdk = init('my-api-key');
      expect(sdk.encrypt).to.be.a('function');
      expect(sdk.run).to.be.a('function');
    });
  });
});
