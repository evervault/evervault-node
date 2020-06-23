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
const testCageName = 'magic-cage';

const encryptionTestFactory = (encrypted, testData, expectedOutputType) => {
  expect(encrypted).to.be.a(expectedOutputType);
  expect(encrypted.split('.').length).to.equal(3);

  const [header, body, uuid] = encrypted.split('.');
  expect(uuid).to.equal(testingUuid);
  expect(dataHelpers.parseBase64ToJson(header)).to.deep.equal(
    testConfig.header
  );
  expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(testData);
};

describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfig);

  context('Encrypting string', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 'testing-data';

    it('Returns the encrypted string in the ev string format', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      encryptionTestFactory(encrypted, testData, 'string');
    });
  });

  context('Encrypting object', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = {
      a: 1,
      b: 'foo',
      c: {
        arr: [1, 2, 3, 4],
      },
    };

    context('Preserve object shape set to true', () => {
      it('Returns the encrypted data in an object', () => {
        const encrypted = testCryptoClient.encrypt(
          testCageName,
          testKey,
          testData,
          { preserveObjectShape: true }
        );
        Object.keys(encrypted).map((encryptedKey) =>
          encryptionTestFactory(
            encrypted[encryptedKey],
            testData[encryptedKey],
            'string'
          )
        );
      });
    });
    context('Preserve object shape set to false', () => {
      it('Returns the encrypted data as a string', () => {
        const encrypted = testCryptoClient.encrypt(
          testCageName,
          testKey,
          testData,
          { preserveObjectShape: false }
        );
        encryptionTestFactory(encrypted, testData, 'string');
      });
    });
  });
});
