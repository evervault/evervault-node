const { expect } = require('chai');
import 'mocha';
import testSdk from '../lib';

// require root of directory - package json should resolve to dist/cjs
const prepareSdkImport = (apikey?: any) => () => testSdk(apikey);

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
      const sdk = testSdk('my-api-key');
      expect(sdk.encrypt).to.be.a('function');
      expect(sdk.run).to.be.a('function');
    });
  });
});
