const crypto = require('crypto');
const Datatypes = require('../utils/datatypes');

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
  const _encryptObject = async (ecdhPublicKey, derivedSecret, data) => {
    return await _traverseObject(ecdhPublicKey, derivedSecret, { ...data });
  };

  const _traverseObject = async (ecdhPublicKey, derivedSecret, data) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = { ...data };
      for (let [key, value] of Object.entries(encryptedObject)) {
        encryptedObject[key] = await _traverseObject(
          ecdhPublicKey,
          derivedSecret,
          value
        );
      }
      return encryptedObject;
    } else if (Datatypes.isArray(data)) {
      const encryptedArray = [...data];
      for (let [key, value] of Object.entries(encryptedArray)) {
        encryptedArray[key] = await _traverseObject(
          ecdhPublicKey,
          derivedSecret,
          value
        );
      }
      return encryptedArray;
    } else {
      return data;
    }
  };

  const base64RemovePadding = (str) => {
    return str.replace(/={1,2}$/, '');
  };

  const _encryptString = async (
    ecdhPublicKey,
    derivedSecret,
    str,
    datatype
  ) => {
    const keyIv = await generateBytes(config.ivLength);

    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedSecret,
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

    return _format(
      datatype,
      keyIv.toString('base64'),
      ecdhPublicKey,
      encryptedBuffer.toString('base64')
    );
  };

  const _evVersionPrefix = base64RemovePadding(
    Buffer.from(config.evVersion).toString('base64')
  );

  const _format = (
    datatype = 'string',
    keyIv,
    ecdhPublicKey,
    encryptedData
  ) => {
    return `ev:${_evVersionPrefix}${
      datatype !== 'string' ? ':' + datatype : ''
    }:${base64RemovePadding(keyIv)}:${base64RemovePadding(
      ecdhPublicKey
    )}:${base64RemovePadding(encryptedData)}:$`;
  };

  const encrypt = async (
    ecdhPublicKey,
    derivedSecret,
    data,
    options = DEFAULT_ENCRYPT_OPTIONS
  ) => {
    if (!Datatypes.isDefined(data)) {
      throw new Error('Data must not be undefined');
    }

    if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(ecdhPublicKey, derivedSecret, data, options);
    } else if (Datatypes.isArray(data)) {
      return await _traverseObject(ecdhPublicKey, derivedSecret, [...data]);
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return { encrypt };
};
