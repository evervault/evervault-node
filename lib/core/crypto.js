const crypto = require('crypto');
const Datatypes = require('../utils/datatypes');
const keyServiceMock = require('../../tests/utilities/keyService.mock');
const uuid = require('uuid').v4;

const generateBytes = (byteLength) => crypto.randomBytes(byteLength);

const DEFAULT_ENCRYPT_OPTIONS = {
  preserveObjectShape: true,
  fieldsToEncrypt: undefined,
};

module.exports = (config) => {
  const _encryptObject = (cageName, cageKey, data, { fieldsToEncrypt }) => {
    const keys = fieldsToEncrypt || Object.keys(data);
    const encryptedObject = { ...data };
    for (let key of keys) {
      if (Datatypes.isUndefined(data[key])) {
        encryptedObject[key] = data[key];
      } else {
        encryptedObject[key] = _encryptString(
          cageName,
          cageKey,
          Datatypes.ensureString(data[key])
        );
      }
    }
    return encryptedObject;
  };

  const _encryptString = (cageName, cageKey, str) => {
    const keyIv = generateBytes(config.keyLength / 2);
    const rootKey = generateBytes(config.keyLength);
    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      rootKey,
      keyIv,
      {
        authTagLength: config.authTagLength,
      }
    );

    const encryptedBuffer = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const encryptedKey = _publicEncrypt(cageKey, rootKey);

    return _format(
      encryptedKey.toString('base64'),
      keyIv.toString('base64'),
      encryptedBuffer.toString('base64')
    );
  };

  const _publicEncrypt = (publicKey, data) => {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        oaepHash: config.publicHash,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      data
    );
  };

  const _format = (encryptedKey, keyIv, encryptedData) => {
    const header = Datatypes.utf8ToBase64(JSON.stringify(config.header));
    const payload = Datatypes.utf8ToBase64(
      JSON.stringify({
        cageData: encryptedKey,
        keyIv,
        encryptedData,
      })
    );
    return `${header}.${payload}.${uuid()}`;
  };

  const encrypt = (cageName, key, data, options = DEFAULT_ENCRYPT_OPTIONS) => {
    if (!Datatypes.isDefined(data)) {
      throw new Error('Data must not be undefined');
    }
    if (!Datatypes.isString(key)) {
      throw new Error('No key supplied to encrypt');
    }

    if (Datatypes.isObjectStrict(data) && options.preserveObjectShape) {
      return _encryptObject(cageName, key, data, options);
    } else {
      return _encryptString(cageName, key, Datatypes.ensureString(data));
    }
  };

  return { encrypt };
};
