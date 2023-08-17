const Evervault = require('Evervault');
const assert = require('chai').assert;

describe('EncryptTest', function () {
  let evervaultClient;

  before(function () {
    const appId = process.env.TEST_EV_APP_ID;
    const apiKey = process.env.TEST_EV_API_KEY;
    evervaultClient = new Evervault(appId, apiKey);
  });

  it('should encrypt and decrypt true', function () {
    const bool = true;
    const encrypted = evervaultClient.encrypt(bool);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.strictEqual(decrypted, bool);
  });

  it('should encrypt and decrypt false', function () {
    const bool = false;
    const encrypted = evervaultClient.encrypt(bool);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.strictEqual(decrypted, bool);
  });

  it('should encrypt and decrypt string', function () {
    const str = 'Hello World!';
    const encrypted = evervaultClient.encrypt(str);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.strictEqual(decrypted, str);
  });

  it('should encrypt and decrypt integer', function () {
    const num = 1234567;
    const encrypted = evervaultClient.encrypt(num);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.strictEqual(decrypted, num);
  });

  it('should encrypt and decrypt float', function () {
    const num = 123.45;
    const encrypted = evervaultClient.encrypt(num);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.strictEqual(decrypted, num);
  });

  it('should encrypt and decrypt array', function () {
    const arr = ['apple', 12345, 123.45];
    const encrypted = evervaultClient.encrypt(arr);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.deepEqual(decrypted, arr);
  });

  it('should encrypt and decrypt associative array (object in JS)', function () {
    const obj = {
      string: 'apple',
      number: 12345,
      double: 123.45,
    };
    const encrypted = evervaultClient.encrypt(obj);
    const decrypted = evervaultClient.decrypt(encrypted);
    assert.deepEqual(decrypted, obj);
  });
});
