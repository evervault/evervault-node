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

const encryptedDataExpectations = (encrypted, datatype) => {
  expect(encrypted).to.be.a('string');
  expect(encrypted.split('.').length).to.equal(3);
  const [header, _, uuid] = encrypted.split('.');
  expect(uuid).to.equal(testingUuid);
  expect(dataHelpers.parseBase64ToJson(header)).to.deep.equal({
    ...testConfig.header,
    datatype,
  });
};

describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfig);

  context('Encrypting string', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 'testing-data';

    it('Returns the encrypted string in the ev string format', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted, 'string');
        const { header, body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(header, body)).to.deep.equal(testData);
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
      it('It encrypts every field', () => {
        return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
          expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));
          const testObjectKey = (key) => {
            const { header, body } = dataHelpers.parseEncryptedData(
              encrypted[key]
            );
            expect(MockCageService.decrypt(header, body)).to.deep.equal(
              testData[key]
            );
          };

          encryptedDataExpectations(encrypted.a, 'number');
          testObjectKey('a');
          encryptedDataExpectations(encrypted.b, 'string');
          testObjectKey('b');
          encryptedDataExpectations(encrypted.c.arr, 'Array');
          const { header, body } = dataHelpers.parseEncryptedData(
            encrypted.c.arr
          );
          expect(MockCageService.decrypt(header, body)).to.deep.equal(
            testData.c.arr
          );
        });
      });
    });
  });

  context('Encrypting numbers', () => {
    const testKey = MockCageService.getMockCageKey();
    const testData = 42;

    it('Returns the data encrypted as a string and it decrypts to a number', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted, 'number');
        const { header, body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(header, body)).to.equal(testData);
      });
    });
  });

  context('Encrypting an array', () => {
    const testData = [1, 2, 3, 4];
    const testKey = MockCageService.getMockCageKey();

    it('Encrypts the array and decrypts it to the input data', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        encryptedDataExpectations(encrypted, 'Array');
        const { header, body } = dataHelpers.parseEncryptedData(encrypted);
        expect(MockCageService.decrypt(header, body)).to.deep.equal(testData);
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

    it('Encrypts the object but ignores null', () => {
      return testCryptoClient.encrypt(testKey, testData).then((encrypted) => {
        expect(Object.keys(encrypted)).to.deep.equal(Object.keys(testData));

        const testEncryptedValue = (key, type) => {
          encryptedDataExpectations(encrypted[key], type);
          const { header, body } = dataHelpers.parseEncryptedData(
            encrypted[key]
          );
          expect(MockCageService.decrypt(header, body)).to.deep.equal(
            testData[key]
          );
        };

        testEncryptedValue('a', 'number');
        testEncryptedValue('b', 'boolean');
        expect(encrypted.c).to.deep.equal(testData.c);
      });
    });
  });

  context('Discards unencryptable data', () => {
    const testKey = MockCageService.getMockCageKey();

    it('Throws an error', () => {
      return testCryptoClient
        .encrypt(testKey, Buffer.from('abc123'))
        .catch((err) => {
          expect(err).to.match(/supplied isn't encryptable/);
        });
    });
  });
});
