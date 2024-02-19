const { expect } = require('chai');
const crypto = require('crypto');
const { unpack } = require('msgpackr');
const Crypto = require('../../lib/core/crypto');
const { errors } = require('../../lib/utils');
const crc32 = require('crc-32');

const testApiKey = 'test-api-key';
const testConfigSecP256k1 = require('../../lib/config').encryption.secp256k1;
const testConfigSecP256r1 = require('../../lib/config').encryption.prime256v1;
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';

const curveSecp256k1 = 'SECP256K1';
const curvePrime256v1 = 'PRIME256V1';

describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfigSecP256k1);

  const ecdh = crypto.createECDH(testConfigSecP256k1.ecdhCurve);
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey(null, 'compressed');
  const derivedSecret = ecdh.computeSecret(
    Buffer.from(testEcdhCageKey, 'base64')
  );

  context('Encrypting object', () => {
    const testData = {
      name: 'testname',
      age: 20,
      array: ['team1', 1],
      dict: {
        subname: 'subtestname',
        subnumber: 2,
      },
    };

    it('Maintains JSON structure', () => {
      return testCryptoClient
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((res) => {
          expect('name' in res).to.be.true;
          expect('dict' in res).to.be.true;
          expect(typeof res['dict'] === 'object' && res['dict'] !== null).to.be
            .true;
          expect(isEvervaultString(res['dict']['subnumber'], 'number')).to.be
            .true;
        });
    });

    it('Encrypts to Evervault string', () => {
      return testCryptoClient
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((res) => {
          recursiveIsEvervaultStringFormat(res);
          expect(isEvervaultString(res['name'], 'string')).to.be.true;
          expect(isEvervaultString(res['age'], 'number')).to.be.true;
        });
    });
  });

  context('Building encoded metadata', () => {
    it('Correctly constructs the encoded metadata', () => {
      let result = testCryptoClient.buildEncodedMetadata(
        'allow-all',
        1691665064
      );
      let expected = Buffer.from(
        'g6JkcqlhbGxvdy1hbGyiZW8FomV0zmTUwqg=',
        'base64'
      );
      expect(expected).to.deep.equal(result);
    });

    it('Correctly constructs the encoded metadata with no role', () => {
      let result = testCryptoClient.buildEncodedMetadata(null, 1691665064);
      let expected = Buffer.from('gqJlbwWiZXTOZNTCqA==', 'base64');
      expect(expected).to.deep.equal(result);
    });
  });

  context('Building ciphertext buffer', () => {
    it('Correctly constructs the buffer without metadata', () => {
      let result = testCryptoClient.buildCipherBuffer('hello world', undefined);
      expect(result.equals(Buffer.from('hello world'))).to.be.true;
    });

    it('correctly constructs the buffer with metadata', () => {
      const dataToEncrypt = 'hello world';

      const result = testCryptoClient.buildCipherBuffer(
        dataToEncrypt,
        'test-role'
      );
      const dataSlice = result.slice(result.length - dataToEncrypt.length);

      const metadataSlice = result.slice(
        0,
        result.length - dataToEncrypt.length
      );
      const metadataLength = metadataSlice.slice(0, 2).readInt16LE();
      const metadataBytes = metadataSlice.slice(2);

      const unpackedMetadata = unpack(metadataBytes);

      expect(dataSlice.equals(Buffer.from('hello world'))).to.be.true;
      expect(metadataLength).to.equal(metadataBytes.length);
      expect(unpackedMetadata.dr).to.equal('test-role');
      expect(unpackedMetadata.eo).to.equal(5);
    });
  });

  context('Data is undefined', () => {
    it('Throws an error', () => {
      return testCryptoClient
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          null
        )
        .catch((err) => {
          expect(err).to.match(/must not be undefined/);
        });
    });
  });

  context('Encrypting a File (Buffer)', () => {
    const testData = Buffer.from([0x01]);

    it('it encrypts a file', async () => {
      return testCryptoClient
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((encryptedFile) => {
          expect(encryptedFile).instanceOf(Buffer);

          expect(
            Buffer.compare(
              encryptedFile.subarray(0, 6),
              Buffer.from('%EVENC', 'utf-8')
            ) == 0
          ).to.be.true;

          // Test that the debug flag is not set
          expect(
            Buffer.compare(
              encryptedFile.subarray(54, 55),
              Buffer.from([0x00])
            ) == 0
          ).to.be.true;

          // Test that the CRC32 checksum is correct compared to library implementation
          const crc32Checksum = crc32.buf(encryptedFile.subarray(0, -4));
          const storedCrc32Checksum = encryptedFile.readInt32LE(
            encryptedFile.length - 4
          );

          expect(crc32Checksum).to.equal(storedCrc32Checksum);
        });
    });

    it('throws error on file size too large', async () => {
      const largeTestData = Buffer.alloc(26 * 1024 * 1024);
      return testCryptoClient
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          largeTestData
        )
        .catch((err) => {
          expect(err).to.be.instanceOf(errors.ExceededMaxFileSizeError);
        });
    });

    it('encrypts a large file when max file size overwritten', async () => {
      const testCryptoClientWithXLFileSize = Crypto({
        ...testConfigSecP256k1,
        maxFileSizeInMB: 30,
      });
      const largeTestData = Buffer.alloc(26 * 1024 * 1024);
      return testCryptoClientWithXLFileSize
        .encrypt(
          curveSecp256k1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          largeTestData
        )
        .then((encryptedFile) => {
          expect(encryptedFile).instanceOf(Buffer);

          expect(
            Buffer.compare(
              encryptedFile.subarray(0, 6),
              Buffer.from('%EVENC', 'utf-8')
            ) == 0
          ).to.be.true;

          // Test that the debug flag is not set
          expect(
            Buffer.compare(
              encryptedFile.subarray(54, 55),
              Buffer.from([0x00])
            ) == 0
          ).to.be.true;
        });
    });
  });

  const recursiveIsEvervaultStringFormat = (data) => {
    if (data !== null && typeof data == 'object') {
      Object.entries(data).forEach(([key, value]) => {
        recursiveIsEvervaultStringFormat(value);
      });
    } else {
      expect(isEvervaultStringFormat(data)).to.be.true;
    }
  };

  const isEvervaultString = (data, type) => {
    parts = data.split(':');
    if (!isEvervaultStringFormat(data)) {
      return false;
    }
    if (type != 'string' && type != parts[2]) {
      return false;
    }
    return true;
  };

  const isEvervaultStringFormat = (data) => {
    parts = data.split(':');
    if (parts.length < 6) {
      return false;
    }
    if (parts[2] == 'number' || parts[2] == 'boolean') {
      return parts.length == 7;
    }
    return true;
  };
});

describe('Crypto Module with P256 Curve', () => {
  const testCryptoClient = Crypto(testConfigSecP256r1);

  const ecdh = crypto.createECDH(testConfigSecP256r1.ecdhCurve);
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey(null, 'compressed');
  const derivedSecret = testCryptoClient.getSharedSecret(
    ecdh,
    Buffer.from(testEcdhCageKey, 'base64'),
    publicKey,
    'prime256v1'
  );

  context('Encrypting object', () => {
    const testData = {
      name: 'testname',
      age: 20,
      array: ['team1', 1],
      dict: {
        subname: 'subtestname',
        subnumber: 2,
      },
    };

    it('Maintains JSON structure', () => {
      return testCryptoClient
        .encrypt(
          curvePrime256v1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((res) => {
          expect('name' in res).to.be.true;
          expect('dict' in res).to.be.true;
          expect(typeof res['dict'] === 'object' && res['dict'] !== null).to.be
            .true;
          expect(isEvervaultString(res['dict']['subnumber'], 'number')).to.be
            .true;
        });
    });

    it('Encrypts to Evervault string', () => {
      return testCryptoClient
        .encrypt(
          curvePrime256v1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((res) => {
          recursiveIsEvervaultStringFormat(res);
          expect(isEvervaultString(res['name'], 'string')).to.be.true;
          expect(isEvervaultString(res['age'], 'number')).to.be.true;
        });
    });
  });

  context('Data is undefined', () => {
    it('Throws an error', () => {
      return testCryptoClient
        .encrypt(
          curvePrime256v1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          null
        )
        .catch((err) => {
          expect(err).to.match(/must not be undefined/);
        });
    });
  });

  context('Encrypting a File (Buffer)', () => {
    const testData = Buffer.from([0x01]);

    it('it encrypts a file', async () => {
      return testCryptoClient
        .encrypt(
          curvePrime256v1,
          testEcdhCageKey,
          publicKey,
          derivedSecret,
          testData
        )
        .then((encryptedFile) => {
          expect(encryptedFile).instanceOf(Buffer);

          expect(
            Buffer.compare(
              encryptedFile.subarray(0, 6),
              Buffer.from('%EVENC', 'utf-8')
            ) == 0
          ).to.be.true;

          // Test that the debug flag is not set
          expect(
            Buffer.compare(
              encryptedFile.subarray(54, 55),
              Buffer.from([0x00])
            ) == 0
          ).to.be.true;
        });
    });
  });

  const recursiveIsEvervaultStringFormat = (data) => {
    if (data !== null && typeof data == 'object') {
      Object.entries(data).forEach(([key, value]) => {
        recursiveIsEvervaultStringFormat(value);
      });
    } else {
      expect(isEvervaultStringFormat(data)).to.be.true;
    }
  };

  const isEvervaultString = (data, type) => {
    parts = data.split(':');
    if (!isEvervaultStringFormat(data)) {
      return false;
    }
    if (type != 'string' && type != parts[2]) {
      return false;
    }
    return true;
  };

  const isEvervaultStringFormat = (data) => {
    parts = data.split(':');
    if (parts.length < 6) {
      return false;
    }
    if (parts[2] == 'number' || parts[2] == 'boolean') {
      return parts.length == 7;
    }
    return true;
  };
});
