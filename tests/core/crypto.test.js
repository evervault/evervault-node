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

const encryptedDataExpectations = (encrypted) => {
  expect(encrypted).to.be.a('string');
  expect(encrypted.split('.').length).to.equal(3);

  const [header, body, uuid] = encrypted.split('.');
  expect(uuid).to.equal(testingUuid);
  expect(dataHelpers.parseBase64ToJson(header)).to.deep.equal(
    testConfig.header
  );
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
      encryptedDataExpectations(encrypted);
      const { body } = dataHelpers.parseEncryptedData(encrypted);
      expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(
        testData
      );
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
      context('No fieldsToEncrypt provided', () => {
        const encryptionOptions = { preserveObjectShape: true };
        it('It encrypts every field', () => {
          const encrypted = testCryptoClient.encrypt(
            testCageName,
            testKey,
            testData,
            encryptionOptions
          );

          Object.keys(encrypted).forEach((objectKey) => {
            encryptedDataExpectations(encrypted[objectKey]);
            const { body } = dataHelpers.parseEncryptedData(
              encrypted[objectKey]
            );
            expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(
              testData[objectKey]
            );
          });
        });
      });
      context('FieldsToEncrypt specified', () => {
        const testFieldsToEncrypt = ['a', 'b'];
        const encryptionOptions = {
          preserveObjectShape: true,
          fieldsToEncrypt: testFieldsToEncrypt,
        };
        it('It encrypts only the specified fields', () => {
          const encrypted = testCryptoClient.encrypt(
            testCageName,
            testKey,
            testData,
            encryptionOptions
          );

          Object.keys(encrypted).forEach((objectKey) => {
            if (testFieldsToEncrypt.includes(objectKey)) {
              encryptedDataExpectations(encrypted[objectKey]);
              const { body } = dataHelpers.parseEncryptedData(
                encrypted[objectKey]
              );
              return expect(
                MockCageService.decrypt(testCageName, body)
              ).to.deep.equal(testData[objectKey]);
            }
            return expect(encrypted[objectKey]).to.deep.equal(
              testData[objectKey]
            );
          });
        });
      });
    });
    context('Preserve object shape set to false', () => {
      const encryptionOptions = { preserveObjectShape: false };
      it('Returns the encrypted data as a string', () => {
        const encrypted = testCryptoClient.encrypt(
          testCageName,
          testKey,
          testData,
          encryptionOptions
        );
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(
          testData
        );
      });
    });
  });

  context('Encrypting buffer', () => {
    const testKey = MockCageService.getMockCageKey();

    const testData = Buffer.from('test data in a buffer', 'utf8');
    it('Returns the buffer encrypted as a string', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      encryptedDataExpectations(encrypted);
      const { body } = dataHelpers.parseEncryptedData(encrypted);
      const decrypted = MockCageService.decrypt(testCageName, body);
      expect(Buffer.from(decrypted)).to.deep.equal(testData);
    });
  });
});
