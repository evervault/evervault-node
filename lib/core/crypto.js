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
  const _encryptObject = async (ecdhPublicKey, derivedAesKey, data) => {
    return await _traverseObject(ecdhPublicKey, derivedAesKey, { ...data });
  };

  const _traverseObject = async (ecdhPublicKey, derivedAesKey, data) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        ecdhPublicKey,
        derivedAesKey,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = { ...data };
      for (let [key, value] of Object.entries(encryptedObject)) {
        encryptedObject[key] = await _traverseObject(ecdhPublicKey, derivedAesKey, value);
      }
      return encryptedObject;
    } else {
      return data;
    }
  };

  const _encryptString = async (ecdhPublicKey, derivedAesKey, str, datatype) => {
    const hash = crypto.createHash('sha256');
    hash.update(derivedAesKey);

    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedAesKey,
      hash.digest(),
      {
        authTagLength: config.authTagLength,
      }
    );

    const encryptedBuffer = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return _format(
      datatype,
      ecdhPublicKey,
      encryptedBuffer.toString('base64')
    );
  };

  const _format = (datatype, ecdhPublicKey, encryptedData) => {
    return `ev:${datatype}:${ecdhPublicKey}:${encryptedData}`;
  };

  const encrypt = async (ecdhPublicKey, derivedAesKey, data, options = DEFAULT_ENCRYPT_OPTIONS) => {
    if (!Datatypes.isDefined(data)) {
      throw new Error('Data must not be undefined');
    }

    if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(ecdhPublicKey, derivedAesKey, data, options);
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        ecdhPublicKey,
        derivedAesKey,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return { encrypt };
};
