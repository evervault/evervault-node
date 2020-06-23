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
  const [header, _, uuid] = encrypted.split('.');
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

          expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));

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

          expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));

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

  context('Encrypting numbers', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 42;

    it('Returns the data encrypted as a string and it decrypts to a number', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      encryptedDataExpectations(encrypted);
      const { body } = dataHelpers.parseEncryptedData(encrypted);
      expect(MockCageService.decrypt(testCageName, body)).to.equal(testData);
    });
  });

  context('Encrypting a function', () => {
    const testData = function (x, y) {
      return x + y;
    };
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the function and decrypts it to a stringified function', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      encryptedDataExpectations(encrypted);
      const { body } = dataHelpers.parseEncryptedData(encrypted);
      const decrypted = MockCageService.decrypt(testCageName, body);
      expect(decrypted).to.equal(testData.toString());
    });
  });

  context('Encrypting an array', () => {
    const testData = [1, 2, 3, 4];
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the array and decrypts it to the input data', () => {
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

  context('Data is undefined', () => {
    const testData = null;
    const testKey = MockCageService.getMockCageKey();

    it('Throws an error', () => {
      try {
        testCryptoClient.encrypt(testCageName, testKey, testData);
      } catch (err) {
        expect(err).to.match(/must not be undefined/);
      }
    });
  });

  context('Passing an undefined cage key', () => {
    const testData = 'Encrypt me';
    const testKey = null;

    it('Throws an error', () => {
      try {
        testCryptoClient.encrypt(testCageName, testKey, testData);
      } catch (err) {
        expect(err).to.match(/No key supplied/);
      }
    });
  });

  context('Encrypting an object with null values', () => {
    const testData = {
      a: 1,
      b: true,
      c: null,
    };
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the object including the null values', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );

      expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));

      Object.keys(encrypted).forEach((objectKey) => {
        encryptedDataExpectations(encrypted[objectKey]);
        const { body } = dataHelpers.parseEncryptedData(encrypted[objectKey]);
        expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(
          testData[objectKey]
        );
      });
    });
  });

  context('Encrypting an object with undefined and null values', () => {
    const testData = {
      a: 1,
      b: null,
      c: undefined,
    };
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the object including the null values, presists the undefined values', () => {
      const encrypted = testCryptoClient.encrypt(
        testCageName,
        testKey,
        testData
      );
      ['a', 'b'].forEach((objectKey) => {
        encryptedDataExpectations(encrypted[objectKey]);
        const { body } = dataHelpers.parseEncryptedData(encrypted[objectKey]);
        expect(MockCageService.decrypt(testCageName, body)).to.deep.equal(
          testData[objectKey]
        );
      });
      expect(encrypted.c).to.deep.equal(testData.c);
    });
  });
});
