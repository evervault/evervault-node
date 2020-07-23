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
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(body)).to.deep.equal(testData);
      });
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
          return testCryptoClient
            .encrypt(testKey, testData, encryptionOptions)
            .then((encrypted) => {
              expect(Object.keys(encrypted)).to.deep.equal(
                Object.keys(testData)
              );

              Object.keys(encrypted).forEach((objectKey) => {
                encryptedDataExpectations(encrypted[objectKey]);
                const { body } = dataHelpers.parseEncryptedData(
                  encrypted[objectKey]
                );
                expect(MockCageService.decrypt(body)).to.deep.equal(
                  testData[objectKey]
                );
              });
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
          return testCryptoClient
            .encrypt(testKey, testData, encryptionOptions)
            .then((encrypted) => {
              expect(Object.keys(encrypted)).to.deep.equal(
                Object.keys(testData)
              );

              Object.keys(encrypted).forEach((objectKey) => {
                if (testFieldsToEncrypt.includes(objectKey)) {
                  encryptedDataExpectations(encrypted[objectKey]);
                  const { body } = dataHelpers.parseEncryptedData(
                    encrypted[objectKey]
                  );
                  return expect(MockCageService.decrypt(body)).to.deep.equal(
                    testData[objectKey]
                  );
                }
                return expect(encrypted[objectKey]).to.deep.equal(
                  testData[objectKey]
                );
              });
            });
        });
      });
    });
  });

  context('Encrypting buffer', () => {
    const testKey = MockCageService.getMockCageKey();

    const testData = Buffer.from('test data in a buffer', 'utf8');
    it('Returns the buffer encrypted as a string', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        const decrypted = MockCageService.decrypt(body);
        expect(Buffer.from(decrypted)).to.deep.equal(testData);
      });
    });
  });

  context('Encrypting numbers', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 42;

    it('Returns the data encrypted as a string and it decrypts to a number', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(body)).to.equal(testData);
      });
    });
  });

  context('Encrypting a function', () => {
    const testData = function (x, y) {
      return x + y;
    };
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the function and decrypts it to a stringified function', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        const decrypted = MockCageService.decrypt(body);
        expect(decrypted).to.equal(testData.toString());
      });
    });
  });

  context('Encrypting an array', () => {
    const testData = [1, 2, 3, 4];
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the array and decrypts it to the input data', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted);
        const { body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(body)).to.deep.equal(testData);
      });
    });
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

  context('Passing an undefined cage key', () => {
    const testData = 'Encrypt me';
    const testKey = null;

    it('Throws an error', () => {
      return testCryptoClient.encrypt(testKey, testData).catch((err) => {
        expect(err).to.match(/No key supplied/);
      });
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
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));

        Object.keys(encrypted).forEach((objectKey) => {
          encryptedDataExpectations(encrypted[objectKey]);
          const { body } = dataHelpers.parseEncryptedData(encrypted[objectKey]);
          expect(MockCageService.decrypt(body)).to.deep.equal(
            testData[objectKey]
          );
        });
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
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        ['a', 'b'].forEach((objectKey) => {
          encryptedDataExpectations(encrypted[objectKey]);
          const { body } = dataHelpers.parseEncryptedData(encrypted[objectKey]);
          expect(MockCageService.decrypt(body)).to.deep.equal(
            testData[objectKey]
          );
        });
        expect(encrypted.c).to.deep.equal(testData.c);
      });
    });
  });
});
