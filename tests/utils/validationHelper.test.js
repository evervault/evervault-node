const { expect } = require('chai');

const { validationHelper } = require('../../lib/utils');

describe('ValidationHelper', () => {
  context('validateApiKey', () => {
    it('throws an error if apiKey is not a string', () => {
      const apiKey = 123;
      const appUuid = 'app_28807f2a6bb1';
      expect(() => validationHelper.validateApiKey(appUuid, apiKey)).to.throw();
    });

    it('throws an error if apiKey is an empty string', () => {
      const apiKey = '';
      const appUuid = 'app_28807f2a6bb1';
      expect(() => validationHelper.validateApiKey(appUuid, apiKey)).to.throw();
    });

    it('throws an error if apiKey is null', () => {
      const apiKey = null;
      const appUuid = 'app_28807f2a6bb1';
      expect(() => validationHelper.validateApiKey(appUuid, apiKey)).to.throw();
    });

    it('throws an error if the appUuid hash does not match the hash included in the apiKey', () => {
      const apiKey =
        'ev:key:1:4p0u52rDNSKV1GnVIKnkhKwxu9B1QLOnzmOtsKuvV9Z6UWEbjPMIUh3oIgeJjVouL:sZ4zvj:TZ2eWW';
      const appUuid = 'app_b50eb7955f3b';
      expect(() => validationHelper.validateApiKey(appUuid, apiKey)).to.throw();
    });

    it('does not throw an error if the scoped api key is valid', () => {
      const apiKey =
        'ev:key:1:1LRhmbSh03YE5UiyHUTdBl17mRaUScfYvksWD2sBQFNntIczIyfOpaW5Lfhwu6EGl:OpgeHN:n2on5g';
      const appUuid = 'app_b50eb7955f3b';
      expect(() =>
        validationHelper.validateApiKey(appUuid, apiKey)
      ).to.not.throw();
    });

    it('does not throw an error if the legacy api key is valid', () => {
      const apiKey = '12345678:12345678-1234-1234-1234-123456789012';
      const appUuid = 'app_28807f2a6bb1';
      expect(() =>
        validationHelper.validateApiKey(appUuid, apiKey)
      ).to.not.throw();
    });
  });

  context('validateRelayOutboundOptions', () => {
    it('throws an error if options is not an object', () => {
      const options = 'not an object';
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.throw();
    });

    it('does not throw an error if options is an object', () => {
      const options = {};
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('does not throw an error if options is undefined', () => {
      const options = undefined;
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('does not throw an error if options is null', () => {
      const options = null;
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('throws an error if options.decryptionDomains is not an array', () => {
      const options = { decryptionDomains: 'not an array' };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.throw();
    });

    it('does not throw an error if options.decryptionDomains is an empty array', () => {
      const options = { decryptionDomains: [] };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('does not throw an error if options.decryptionDomains is an array of strings', () => {
      const options = { decryptionDomains: ['example.com'] };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('does not throw an error if options.decryptionDomains is not defined', () => {
      const options = {};
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options.decryptionDomains)
      ).to.not.throw();
    });

    it('does not throw an error if options.decryptionDomains is null', () => {
      const options = { decryptionDomains: null };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options.decryptionDomains)
      ).to.not.throw();
    });

    it('throws an error if options.debugRequests is not a boolean', () => {
      const options = { debugRequests: 'not a boolean' };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.throw();
    });

    it('does not throw an error if options.debugRequests is a boolean', () => {
      const options = { debugRequests: true };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options)
      ).to.not.throw();
    });

    it('does not throw an error if options.debugRequests is not defined', () => {
      const options = {};
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options.debugRequests)
      ).to.not.throw();
    });

    it('does not throw an error if options.debugRequests is null', () => {
      const options = { debugRequests: null };
      expect(() =>
        validationHelper.validateRelayOutboundOptions(options.debugRequests)
      ).to.not.throw();
    });
  });
});
