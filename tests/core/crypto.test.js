const { expect } = require('chai');
const crypto = require('crypto');
const Crypto = require('../../lib/core/crypto');

const testApiKey = 'test-api-key';
const testConfigSecP256k1 =
  require('../../lib/config')(testApiKey).encryption.secp256k1;
const testConfigSecP256r1 =
  require('../../lib/config')(testApiKey).encryption.secp256r1;
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';

describe('Crypto Module', () => {
  const testCryptoClient = Crypto(testConfigSecP256k1);

  const ecdh = crypto.createECDH(testConfigSecP256k1.ecdhCurve);
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey(null, 'compressed').toString('base64');
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
        .encrypt(publicKey, derivedSecret, testData)
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
        .encrypt(publicKey, derivedSecret, testData)
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
        .encrypt(publicKey, derivedSecret, null)
        .catch((err) => {
          expect(err).to.match(/must not be undefined/);
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
  const publicKey = ecdh.getPublicKey(null, 'compressed').toString('base64');
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
        .encrypt(publicKey, derivedSecret, testData)
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
        .encrypt(publicKey, derivedSecret, testData)
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
        .encrypt(publicKey, derivedSecret, null)
        .catch((err) => {
          expect(err).to.match(/must not be undefined/);
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
