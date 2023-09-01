const { expect } = require('chai');
const Evervault = require('../lib');

describe('Encrypt and Decrypt', () => {
  const appUuid = process.env.EV_APP_UUID;
  const apiKey = process.env.EV_API_KEY;

  let evervaultClient;

  beforeEach(() => {
    evervaultClient = new Evervault(appUuid, apiKey);
  });

  context('Encrypt and Decrypt', () => {
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
});
