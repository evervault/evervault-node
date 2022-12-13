const { expect } = require('chai');

const { validationHelper } = require('../../lib/utils');

describe('ValidationHelper', () => {
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
