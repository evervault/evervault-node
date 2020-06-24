const crypto = require('crypto');
const Datatypes = require('../utils/datatypes');
const uuid = require('uuid').v4;

/**
 * @param {number} byteLength Number of random bytes to generate
 * @returns {Buffer} Buffer of random bytes
 */
const generateBytes = (byteLength) => crypto.randomBytes(byteLength);

const DEFAULT_ENCRYPT_OPTIONS = {
  preserveObjectShape: true,
  fieldsToEncrypt: undefined,
};

module.exports = (config) => {
  /**
   * @param {string} cageName Name of the cage to encrypt the data for
   * @param {string} cageKey The cage encryption key
   * @param {object} data The data to encrypt
   * @param {object} options Encryption options
   * @param {?string[]} options.fieldsToEncrypt The fields in the object to encrypt
   * @returns {object} Encrypted data
   */
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

  /**
   * @param {string} cageName Name of the cage to encrypt the data for
   * @param {string} cageKey The cage encryption key
   * @param {string} str The string to encrypt
   * @returns {string} Encrypted data
   */
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

    return _format({
      sharedEncryptedKeys: {
        [cageName]: encryptedKey.toString('base64'),
      },
      keyIv: keyIv.toString('base64'),
      encryptedData: encryptedBuffer.toString('base64'),
    });
  };

  /**
   * @param {string} publicKey Public key used to encrypt the data
   * @param {Buffer} data Buffer of data to encrypt
   * @returns {Buffer} Buffer of encrypted data
   */
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

  /**
   * Structures the data for use in cages
   * @param {object} obj Json object of encrypted data
   * @returns {string} Structured data
   */
  const _format = (obj) => {
    const header = Datatypes.utf8ToBase64(JSON.stringify(config.header));
    const payload = Datatypes.utf8ToBase64(JSON.stringify(obj));
    return `${header}.${payload}.${uuid()}`;
  };

  /**
   * Encrypt data for use in an evervault cage
   * @param {string} cageName Name of the cage the data is being encrypted for
   * @param {string} key The cage's encryption key
   * @param {any} data Data to encrypt
   * @param {object} options Encryption options
   * @param {?boolean} options.preserveObjectShape
   * @param {?string[]} options.fieldsToEncrypt
   * @returns {object | string} Encrypted data
   */
  const encrypt = (cageName, key, data, options = DEFAULT_ENCRYPT_OPTIONS) => {
    if (Datatypes.isUndefined(data)) {
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
