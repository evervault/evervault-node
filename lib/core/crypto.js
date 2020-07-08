const crypto = require('crypto');
const Datatypes = require('../utils/datatypes');
const uuid = require('uuid').v4;

const generateBytes = (byteLength) => {
  return new Promise((resolve, reject) =>
    crypto.randomBytes(byteLength, (err, buf) => {
      return err ? reject(err) : resolve(buf);
    })
  );
};

const DEFAULT_ENCRYPT_OPTIONS = {
  preserveObjectShape: true,
  fieldsToEncrypt: undefined,
};

module.exports = (config) => {
  const _encryptObject = async (cageKey, data, { fieldsToEncrypt }) => {
    const keys = fieldsToEncrypt || Object.keys(data);
    const encryptedObject = { ...data };
    for (let key of keys) {
      if (Datatypes.isUndefined(data[key])) {
        encryptedObject[key] = data[key];
      } else {
        encryptedObject[key] = await _encryptString(
          cageKey,
          Datatypes.ensureString(data[key])
        );
      }
    }
    return encryptedObject;
  };

  const _encryptString = async (cageKey, str) => {
    const keyIv = await generateBytes(config.keyLength / 2);
    const rootKey = await generateBytes(config.keyLength);
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
        sharedEncryptedData: encryptedData,
      })
    );
    return `${header}.${payload}.${uuid()}`;
  };

  const encrypt = async (key, data, options = DEFAULT_ENCRYPT_OPTIONS) => {
    if (!Datatypes.isDefined(data)) {
      throw new Error('Data must not be undefined');
    }
    if (!Datatypes.isString(key)) {
      throw new Error('No key supplied to encrypt');
    }

    if (Datatypes.isObjectStrict(data) && options.preserveObjectShape) {
      return await _encryptObject(key, data, options);
    } else {
      return await _encryptString(key, Datatypes.ensureString(data));
    }
  };

  return { encrypt };
};
