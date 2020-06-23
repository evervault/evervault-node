const { expect } = require('chai');
const MockCageService = require('../utilities/keyService.mock')();
const rewire = require('rewire');
const Crypto = rewire('../../lib/core/crypto');
const testingUuid = 'returned-uuid';
Crypto.__set__({
  uuid: () => testingUuid,
});

const testApiKey = 'test-api-key';
const testConfig = require('../../lib/config')(testApiKey);
const testCageName = 'magic-cage';

describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfig.encryption);

  context('Encrypting string', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 'testing-data';

    it('Returns the encrypted string in the ev string format', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      expect(encrypted).to.be.a('string');
      expect(encrypted.split('.').length).to.equal(3);
      const [header, body, uuid] = encrypted.split('.');
      expect(uuid).to.equal(testingUuid);
    });
  });
});
