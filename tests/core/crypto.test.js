const { expect } = require('chai');
const { createKeyServiceMock, dataHelpers } = require('../utilities');

const MockCageService = createKeyServiceMock();
const rewire = require('rewire');
const Crypto = rewire('../../lib/core/crypto');
const testingUuid = 'returned-uuid';
Crypto.__set__({
  uuid: () => testingUuid,
});

const testApiKey = 'test-api-key';
const testConfig = require('../../lib/config')(testApiKey).encryption;


describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfig);

  context('Encrypting object', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = {
      a: 1,
      b: 'foo',
      c: {
        arr: [1, 2, 3, 4],
      },
    };
  });


  context('Data is undefined', () => {
    const testData = null;
    const testKey = MockCageService.getMockCageKey();

    it('Throws an error', () => {
      return testCryptoClient.encrypt(testKey, testData).catch((err) => {
        expect(err).to.match(/must not be undefined/);
      });
    });
  });
});
