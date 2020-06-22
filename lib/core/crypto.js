const crypto = require('crypto');
const Datatypes = require('../utils/datatypes');
const uuid = require('uuid').v4;

const generateBytes = (byteLength) => crypto.randomBytes(byteLength);

class CryptoClient {
  constructor(config) {
    this.config = config;
  }

  encrypt(cageName, key, data, options = {}) {
    if (Datatypes.isUndefined(data)) {
      throw new Error('Data must not be undefined');
    }
    if (!Datatypes.isString(key)) {
      throw new Error('No key supplied to encrypt');
    }

    const cryptoKey = Datatypes.base64ToBuffer(key);
    if (
      Datatypes.isObject(data) &&
      !Datatypes.isArray(data) &&
      options.preserveObjectShape
    ) {
      return this._encryptObject(cageName, cryptoKey, data, options);
    } else {
      return this._encryptString(
        cageName,
        cryptoKey,
        Datatypes.ensureString(data)
      );
    }
  }

  _encryptObject(cageName, cageKey, data, { fieldsToEncrypt }) {
    const keys = fieldsToEncrypt || Object.keys(data);
    const encryptedObject = { ...data };
    for (let key of keys) {
      encryptedObject[key] = this._encryptString(cageName, cageKey, data[key]);
    }
    return encryptedObject;
  }

  _encryptString(cageName, cageKey, str) {
    const keyIv = generateBytes(this.config.keyLength / 2);
    const rootKey = generateBytes(this.config.keyLength);
    const cipher = crypto.createCipheriv(
      this.config.cipherAlgorithm,
      rootKey,
      keyIv,
      {
        authTagLength: this.config.authTagLength,
      }
    );

    const encryptedBuffer = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const encryptedKey = this._publicEncrypt(cageKey, rootKey);

    return this._format({
      sharedEncryptedKeys: {
        [cageName]: encryptedKey.toString('base64'),
      },
      keyIv: keyIv.toString('base64'),
      encryptedData: encryptedBuffer.toString('base64'),
    });
  }

  _publicEncrypt(publicKey, data) {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        oaepHash: this.config.publicHash,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      data
    );
  }

  _format(obj) {
    const header = Datatypes.utf8ToBase64(JSON.stringify(this.config.header));
    const payload = Datatypes.utf8ToBase64(JSON.stringify(obj));
    return `${header}.${payload}.${uuid()}`;
  }
}

module.exports = (config) => {
  return new CryptoClient(config);
};
