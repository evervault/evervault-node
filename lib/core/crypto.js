/**
 * @typedef {import('crypto').CipherGCM} CipherGCM
 * @typedef {import('crypto').CipherGCMOptions} CipherGCMOptions
 */

const crypto = require('crypto');
const { Encoding } = require('../curves');
const Datatypes = require('../utils/datatypes');
const { errors } = require('../utils');
const CRC32 = require('../utils/crc32');

const PRIME256V1 = 'prime256v1';
const SECP256K1 = 'secp256k1';

/**
 * @param {number} byteLength
 * @returns {Promise<Buffer>}
 */
const generateBytes = (byteLength) => {
  return new Promise((resolve, reject) =>
    crypto.randomBytes(byteLength, (err, buf) => {
      return err ? reject(err) : resolve(buf);
    })
  );
};

/** @type {{ [key: string]: any }} */
const DEFAULT_ENCRYPT_OPTIONS = {
  preserveObjectShape: true,
  fieldsToEncrypt: undefined,
};

/**
 * @param {import('../types').CurveConfig & { maxFileSizeInMB: number }} config
 */
module.exports = (config) => {
  const MAX_FILE_SIZE_IN_BYTES = config.maxFileSizeInMB * 1024 * 1024;

  /**
   * @param {string} curve
   * @param {string} ecdhTeamKey
   * @param {string} ecdhPublicKey
   * @param {Buffer} derivedSecret
   * @param {any} data
   * @param {string | boolean | undefined} role
   * @returns {Promise<any>}
   */
  const _encryptObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role
  ) => {
    /** @type {{ [key: string]: any }} */
    const encryptedObject = {};
    for (const [key, value] of Object.entries(data)) {
      encryptedObject[key] = await encrypt(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        value,
        role
      );
    }
    return encryptedObject;
  };

  /**
   * @param {string} curve
   * @param {string} ecdhTeamKey
   * @param {string} ecdhPublicKey
   * @param {Buffer} derivedSecret
   * @param {any} data
   * @param {string | boolean | undefined} role
   * @returns {Promise<any>}
   */
  const _traverseObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role
  ) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data) || 'string',
        role
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = {};
      for (const [key, value] of Object.entries(data)) {
        encryptedObject[key] = await _traverseObject(
          curve,
          ecdhTeamKey,
          ecdhPublicKey,
          derivedSecret,
          value,
          role
        );
      }
      return encryptedObject;
    } else if (Datatypes.isArray(data)) {
      const encryptedArray = [];
      for (let i = 0; i < data.length; i++) {
        encryptedArray[i] = await encrypt(
          curve,
          ecdhTeamKey,
          ecdhPublicKey,
          derivedSecret,
          data[i],
          role
        );
      }
      return encryptedArray;
    } else {
      return data;
    }
  };

  /**
   * @param {string} str
   * @returns {string}
   */
  const base64RemovePadding = (str) => {
    return str.replace(/={1,2}$/, '');
  };

  /**
   * @param {crypto.ECDH} ecdh
   * @param {string} publicKey
   * @param {string} ephemeralPublicKey
   * @param {string} curveName
   * @returns {Buffer}
   */
  const getSharedSecret = (ecdh, publicKey, ephemeralPublicKey, curveName) => {
    const secret = ecdh.computeSecret(Buffer.from(publicKey, 'base64'));
    const uncompressedKey = crypto.ECDH.convertKey(
      ephemeralPublicKey,
      curveName,
      'base64',
      'base64',
      'uncompressed'
    );
    const concatSecret = Buffer.concat([
      secret,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      Encoding.encodePublicKey(curveName, uncompressedKey),
    ]);

    const hash = crypto.createHash('sha256');
    hash.update(concatSecret);
    return hash.digest();
  };

  /**
   * @param {string} dataType
   * @param {boolean} hasDataPolicy
   * @param {Buffer} ephemeralPublicKeyBytes
   * @param {Buffer} appPublicKeyBytes
   * @returns {Buffer}
   */
  function createV2Aad(
    dataType,
    hasDataPolicy,
    ephemeralPublicKeyBytes,
    appPublicKeyBytes
  ) {
    let dataTypeNumber = 0; // Default to String

    if (dataType === 'number') {
      dataTypeNumber = 1;
    } else if (dataType === 'boolean') {
      dataTypeNumber = 2;
    }

    let versionPrefix = _evVersionPrefix(hasDataPolicy);
    let versionNumber =
      versionPrefix === 'S0lS' ? 0 : versionPrefix === 'QkTC' ? 1 : undefined;

    if (versionNumber === undefined) {
      throw new Error(
        'This encryption version does not have a version number for AAD'
      );
    }

    const configByteSize = 1;
    const totalSize =
      configByteSize +
      ephemeralPublicKeyBytes.length +
      appPublicKeyBytes.length;
    const aad = Buffer.alloc(totalSize);

    // Set the configuration byte
    const b = 0x00 | (dataTypeNumber << 4) | versionNumber; // Node SDK doesn't support debug strings, so always start with 0x00
    aad[0] = b;

    // Copy ephemeral public key bytes into aad
    ephemeralPublicKeyBytes.copy(aad, configByteSize);

    // Copy application public key bytes into aad
    appPublicKeyBytes.copy(
      aad,
      configByteSize + ephemeralPublicKeyBytes.length
    );

    return aad;
  }

  /**
   * @param {string} curve
   * @param {string} ecdhTeamKey
   * @param {string} ecdhPublicKey
   * @param {Buffer} derivedSecret
   * @param {string} str
   * @param {string} datatype
   * @param {string | boolean | undefined} role
   * @returns {Promise<string>}
   */
  const _encryptString = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    str,
    datatype,
    role
  ) => {
    const keyIv = await generateBytes(config.ivLength);
    /** @type {import('crypto').CipherGCMOptions} */
    const cipherOptions = {
      authTagLength: config.authTagLength,
    };
    const cipher = /** @type {import('crypto').CipherGCM} */ (
      crypto.createCipheriv(
        config.cipherAlgorithm,
        derivedSecret,
        keyIv,
        cipherOptions
      )
    );
    if (role && (curve === PRIME256V1 || curve === SECP256K1)) {
      const aad = createV2Aad(
        datatype,
        true,
        Buffer.from(ecdhPublicKey, 'base64'),
        Buffer.from(ecdhTeamKey, 'base64')
      );
      cipher.setAAD(aad);
    } else if (curve === PRIME256V1) {
      cipher.setAAD(Buffer.from(ecdhTeamKey, 'base64'));
    }

    const result = buildCipherBuffer(str, role);

    const encryptedBuffer = Buffer.concat([
      cipher.update(result),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return _format(
      keyIv.toString('base64'),
      ecdhPublicKey,
      encryptedBuffer.toString('base64'),
      datatype,
      role
    );
  };

  /**
   * @param {string | boolean} role
   * @param {number} encryptionTimestamp
   * @returns {Buffer}
   */
  const buildEncodedMetadata = (role, encryptionTimestamp) => {
    let buffer = [];

    // Binary representation of a fixed map with 2 or 3 items, followed by the key-value pairs.
    buffer.push(0x80 | (!role ? 2 : 3));

    if (role) {
      // `dr` (data role) => role_name
      // Binary representation for a fixed string of length 2, followed by `dr`
      buffer.push(0xa2);
      buffer.push(...'dr'.split('').map((c) => c.charCodeAt(0)));

      // Binary representation for a fixed string of role name length, followed by the role name itself.
      const roleStr = role.toString();
      buffer.push(0xa0 | roleStr.length);
      buffer.push(...roleStr.split('').map((c) => c.charCodeAt(0)));
    }

    // "eo" (encryption origin) => 5 (Node SDK)
    // Binary representation for a fixed string of length 2, followed by `eo`
    buffer.push(0xa2);
    buffer.push(...'eo'.split('').map((c) => c.charCodeAt(0)));

    // Binary representation for the integer 5
    buffer.push(5);

    // "et" (encryption timestamp) => current time
    // Binary representation for a fixed string of length 2, followed by `et`
    buffer.push(0xa2);
    buffer.push(...'et'.split('').map((c) => c.charCodeAt(0)));

    // Binary representation for a 4-byte unsigned integer (uint 32), followed by the epoch time
    buffer.push(0xce);
    buffer.push((encryptionTimestamp >> 24) & 0xff);
    buffer.push((encryptionTimestamp >> 16) & 0xff);
    buffer.push((encryptionTimestamp >> 8) & 0xff);
    buffer.push(encryptionTimestamp & 0xff);

    return Buffer.from(buffer);
  };

  /**
   * @param {string | Buffer} data
   * @param {string | boolean | undefined} role
   * @returns {Buffer}
   */
  const buildCipherBuffer = (data, role) => {
    let result;
    if (role) {
      const metadataBytes = buildEncodedMetadata(
        role,
        Math.floor(new Date().getTime() / 1000)
      );
      let offsetBuffer = Buffer.allocUnsafe(2);
      offsetBuffer.writeUInt16LE(metadataBytes.length);
      result = Buffer.concat([offsetBuffer, metadataBytes, Buffer.from(data)]);
    } else {
      result = Buffer.from(data);
    }
    return result;
  };

  /**
   * @param {string | boolean | undefined} role
   * @returns {string}
   */
  const _evVersionPrefix = (role) =>
    role ? config.evVersionWithMetadata : config.evVersion;

  /**
   * @returns {Buffer}
   */
  const _evEncryptedFileVersion = () => {
    if (config.ecdhCurve == 'secp256k1') {
      return Buffer.from([0x02]);
    } else if (config.ecdhCurve === 'prime256v1') {
      return Buffer.from([0x03]);
    } else {
      throw new Error('Invalid curve specified');
    }
  };

  /**
   * @param {string} keyIv
   * @param {string} ecdhPublicKey
   * @param {string} encryptedData
   * @param {string} datatype
   * @param {string | boolean | undefined} role
   * @returns {string}
   */
  const _format = (
    keyIv,
    ecdhPublicKey,
    encryptedData,
    datatype,
    role
  ) => {
    return `ev:${_evVersionPrefix(role)}${
      datatype !== 'string' ? ':' + datatype : ''
    }:${base64RemovePadding(keyIv)}:${base64RemovePadding(
      Buffer.from(ecdhPublicKey, 'base64').toString('base64')
    )}:${base64RemovePadding(encryptedData)}`;
  };

  /**
   * @param {Buffer} data
   * @param {boolean} setAuthData
   * @param {Buffer} derivedSecret
   * @param {string} ecdhTeamKey
   * @param {Buffer} keyIv
   * @returns {Buffer}
   */
  const _encryptBytes = (
    data,
    setAuthData,
    derivedSecret,
    ecdhTeamKey,
    keyIv
  ) => {
    /** @type {import('crypto').CipherGCMOptions} */
    const cipherOptions = {
      authTagLength: config.authTagLength,
    };
    const cipher = /** @type {import('crypto').CipherGCM} */ (
      crypto.createCipheriv(
        config.cipherAlgorithm,
        derivedSecret,
        keyIv,
        cipherOptions
      )
    );

    if (setAuthData) {
      cipher.setAAD(Buffer.from(ecdhTeamKey, 'base64'));
    }

    return Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
  };

  /**
   * @param {string} curve
   * @param {string} ecdhTeamKey
   * @param {string} ecdhPublicKey
   * @param {Buffer} derivedSecret
   * @param {Buffer} data
   * @param {string | undefined} role
   * @returns {Promise<Buffer>}
   */
  const _encryptFile = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role
  ) => {
    const fileSizeInBytes = data.length;
    if (role) {
      throw new errors.DataRolesNotSupportedError(
        "Data roles aren't supported for files"
      );
    }

    if (fileSizeInBytes > MAX_FILE_SIZE_IN_BYTES) {
      throw new errors.ExceededMaxFileSizeError(
        `File size must be less than ${config.maxFileSizeInMB}MB`
      );
    }
    const keyIv = await generateBytes(config.ivLength);

    const setAuthData = curve === PRIME256V1 || role ? true : false;
    const encryptedBuffer = _encryptBytes(
      data,
      setAuthData,
      derivedSecret,
      ecdhTeamKey,
      keyIv
    );

    return _formatFile(keyIv, ecdhPublicKey, encryptedBuffer);
  };

  /**
   * @returns {Buffer}
   */
  const _calculateOffsetToData = () => {
    return Buffer.from([0x37, 0x00]); // 55 bytes to starting byte of data if no metadtata
  };

  /**
   * @param {Buffer} keyIv
   * @param {string} ecdhPublicKey
   * @param {Buffer} encryptedData
   * @returns {Promise<Buffer>}
   */
  const _formatFile = async (keyIv, ecdhPublicKey, encryptedData) => {
    const evEncryptedFileIdentifier = Buffer.from([
      0x25, 0x45, 0x56, 0x45, 0x4e, 0x43,
    ]);

    const versionNumber = _evEncryptedFileVersion();
    const offsetToData = _calculateOffsetToData();
    const flags = Buffer.from([0x00]);

    const fileHeaders = Buffer.concat([
      evEncryptedFileIdentifier,
      versionNumber,
      offsetToData,
      Buffer.from(ecdhPublicKey),
      Buffer.from(keyIv),
      flags,
    ]);

    let fileContents = Buffer.concat([fileHeaders, Buffer.from(encryptedData)]);

    const crc32Hash = CRC32(fileContents);

    const crc32HashBytes = Buffer.alloc(4);
    crc32HashBytes.writeInt32LE(crc32Hash);

    return Buffer.concat([fileContents, crc32HashBytes]);
  };

  /**
   * @param {string} curve
   * @param {string} ecdhTeamKey
   * @param {string} ecdhPublicKey
   * @param {Buffer} derivedSecret
   * @param {any} data
   * @param {string | boolean | undefined} role
   * @param {object} [options]
   * @returns {Promise<any>}
   */
  const encrypt = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role,
    options = DEFAULT_ENCRYPT_OPTIONS
  ) => {
    if (!Datatypes.isDefined(data)) {
      throw new Error('Data must not be undefined');
    }

    if (Datatypes.isBuffer(data)) {
      return await _encryptFile(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        data,
        role
      );
    } else if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        data,
        role
      );
    } else if (Datatypes.isArray(data)) {
      return await _traverseObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        [...data],
        role
      );
    } else if (Datatypes.isEncryptable(data)) {
      const headerType = Datatypes.getHeaderType(data);
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        headerType || 'string',
        role
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return {
    encrypt,
    getSharedSecret,
    generateBytes,
    buildCipherBuffer,
    buildEncodedMetadata,
  };
};
