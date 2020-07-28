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
  const _encryptObject = async (cageKey, data) => {
    return await _traverseObject(cageKey, { ...data });
  };

  const _traverseObject = async (cageKey, data) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        cageKey,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = { ...data };
      for (let [key, value] of Object.entries(encryptedObject)) {
        encryptedObject[key] = await _traverseObject(cageKey, value);
      }
      return encryptedObject;
    } else {
      return data;
    }
  };

  const _encryptString = async (cageKey, str, datatype) => {
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
      datatype,
      encryptedKey.toString('base64'),
      keyIv.toString('base64'),
      encryptedBuffer.toString('base64')
    );
  };

  const _publicEncrypt = (publicKey, data) => {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      data
    );
  };

  const _format = (datatype, encryptedKey, keyIv, encryptedData) => {
    const header = Datatypes.utf8ToBase64Url(
      JSON.stringify({ ...config.header, datatype })
    );
    const payload = Datatypes.utf8ToBase64Url(
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

    if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(key, data, options);
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        key,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return { encrypt };
};
