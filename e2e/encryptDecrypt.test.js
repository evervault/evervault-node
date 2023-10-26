const { expect } = require('chai');
const Evervault = require('../lib');
const {
  ApiKeyError,
  EvervaultError,
  DecryptForbiddenError,
} = require('../lib/utils/errors');

describe('Encrypt and Decrypt', () => {
  const appUuid = process.env.EV_APP_UUID;
  const apiKey = process.env.EV_API_KEY;

  const metadataStringRegex =
    /((ev(:|%3A))(debug(:|%3A))?((QlJV|TENZ|)(:|%3A))?((number|boolean|string)(:|%3A))?(([A-z0-9+\/=%]+)(:|%3A)){3}(\$|%24))|(((eyJ[A-z0-9+=.]+){2})([\w]{8}(-[\w]{4}){3}-[\w]{12}))/;

  let evervaultClient;

  const checkObjectHasStringsWithCorrectVersions = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        for (const arrVal of obj[key]) {
          if (!metadataStringRegex.test(arrVal)) return false;
        }
      } else {
        if (!metadataStringRegex.test(value)) return false;
      }
    }
    return true;
  };

  context('Encrypt and Decrypt with K1 curve', () => {
    beforeEach(() => {
      evervaultClient = new Evervault(appUuid, apiKey);
    });

    it('encrypts boolean true', async () => {
      const payload = true;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt boolean false', async () => {
      const payload = false;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt string', async () => {
      const payload = 'hello world';
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt integer', async () => {
      const payload = 1;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt float', async () => {
      const payload = 1.5;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt array', async () => {
      const payload = ['hello', 1, 1.5, true, false];
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.deep.equal(decrypted);
    });

    it('Encrypt object', async () => {
      const payload = {
        string: 'hello',
        integer: 1,
        float: 1.5,
        true: true,
        false: false,
        array: ['hello', 1, 1.5, true, false],
      };
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.deep.equal(decrypted);
    });
  });

  context('Encrypt and Decrypt with R1 curve', () => {
    beforeEach(() => {
      evervaultClient = new Evervault(appUuid, apiKey, { curve: 'prime256v1' });
    });

    it('encrypts boolean true', async () => {
      const payload = true;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt boolean false', async () => {
      const payload = false;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt string', async () => {
      const payload = 'hello world';
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt integer', async () => {
      const payload = 1;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt float', async () => {
      const payload = 1.5;
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.equal(decrypted);
    });

    it('Encrypt array', async () => {
      const payload = ['hello', 1, 1.5, true, false];
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.deep.equal(decrypted);
    });

    it('Encrypt object', async () => {
      const payload = {
        string: 'hello',
        integer: 1,
        float: 1.5,
        true: true,
        false: false,
        array: ['hello', 1, 1.5, true, false],
      };
      const encrypted = await evervaultClient.encrypt(payload);
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.deep.equal(decrypted);
    });
  });

  context('Encrypt and Decrypt with Metadata', () => {
    beforeEach(() => {
      evervaultClient = new Evervault(appUuid, apiKey, { curve: 'prime256v1' });
    });

    it('encrypts with metadata and decryption is permitted', async () => {
      const payload = {
        string: 'hello',
        integer: 1,
        float: 1.5,
        true: true,
        false: false,
        array: ['hello', 1, 1.5, true, false],
      };
      const encrypted = await evervaultClient.encrypt(payload, 'permit-all');
      expect(checkObjectHasStringsWithCorrectVersions(encrypted)).to.be.true;
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(payload).to.deep.equal(decrypted);
    });

    it('encrypts with metadata and decryption is not permitted', async () => {
      const payload = {
        string: 'hello',
        integer: 1,
        float: 1.5,
        true: true,
        false: false,
        array: ['hello', 1, 1.5, true, false],
      };
      const encrypted = await evervaultClient.encrypt(payload, 'forbid-all');
      expect(checkObjectHasStringsWithCorrectVersions(encrypted)).to.be.true;
      evervaultClient.decrypt(encrypted).then((result) => {
        expect(result).to.be.instanceOf(DecryptForbiddenError);
      });
    });

    it('encrypts a file with metadata but metadata is not embedded and decrypts are permitted', async () => {
      const data = Buffer.from('hello world');
      const encrypted = await evervaultClient.encrypt(data, 'forbid-all');
      const decrypted = await evervaultClient.decrypt(encrypted);
      expect(data.equals(decrypted)).to.be.true;
    });

    it('fails if role fails validation', () => {
      const payload = 'test';
      evervaultClient
        .encrypt(payload, 'a-really-long-and-invalid-data-role')
        .then((result) => {
          expect(result).to.be.instanceOf(EvervaultError);
        });
    });
  });
});
