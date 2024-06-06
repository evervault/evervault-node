const crypto = require('crypto');
const { Encoding } = require('../curves');
const Datatypes = require('../utils/datatypes');
const { errors } = require('../utils');
const CRC32 = require('../utils/crc32');

const PRIME256V1 = 'prime256v1';
const SECP256K1 = 'secp256k1';

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

/**
 * @param {import('../types').CurveConfig} config
 */
module.exports = (config) => {
  let MAX_FILE_SIZE_IN_BYTES = config.maxFileSizeInMB * 1024 * 1024;
  const _encryptObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role
  ) => {
    return await _traverseObject(
      curve,
      ecdhTeamKey,
      ecdhPublicKey,
      derivedSecret,
      { ...data },
      role
    );
  };
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
        Datatypes.getHeaderType(data),
        role
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = { ...data };
      for (let [key, value] of Object.entries(encryptedObject)) {
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
      const encryptedArray = [...data];
      for (let [key, value] of Object.entries(encryptedArray)) {
        encryptedArray[key] = await _traverseObject(
          curve,
          ecdhTeamKey,
          ecdhPublicKey,
          derivedSecret,
          value,
          role
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
    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedSecret,
      keyIv,
      {
        authTagLength: config.authTagLength,
      }
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
      datatype,
      keyIv.toString('base64'),
      ecdhPublicKey,
      encryptedBuffer.toString('base64'),
      role
    );
  };

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
      buffer.push(0xa0 | role.length);
      buffer.push(...role.split('').map((c) => c.charCodeAt(0)));
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

  const _evVersionPrefix = (role) =>
    role ? config.evVersionWithMetadata : config.evVersion;

  const _evEncryptedFileVersion = () => {
    if (config.ecdhCurve == 'secp256k1') {
      return Buffer.from([0x02]);
    } else if (config.ecdhCurve === 'prime256v1') {
      return Buffer.from([0x03]);
    } else {
      throw new Error('Invalid curve specified');
    }
  };

  const _format = (
    datatype = 'string',
    keyIv,
    ecdhPublicKey,
    encryptedData,
    role
  ) => {
    return `ev:${_evVersionPrefix(role)}${
      datatype !== 'string' ? ':' + datatype : ''
    }:${base64RemovePadding(keyIv)}:${base64RemovePadding(
      ecdhPublicKey.toString('base64')
    )}:${base64RemovePadding(encryptedData)}:$`;
  };

  const _encryptBytes = (
    data,
    setAuthData,
    derivedSecret,
    ecdhTeamKey,
    keyIv
  ) => {
    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedSecret,
      keyIv,
      {
        authTagLength: config.authTagLength,
      }
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

    return _formatFile(
      keyIv,
      ecdhPublicKey,
      encryptedBuffer,
      encryptedMetadataBytes
    );
  };

  const _calculateOffsetToData = () => {
    return Buffer.from([0x37, 0x00]); // 55 bytes to starting byte of data if no metadtata
  };

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

  const encrypt = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    role = undefined,
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
        role,
        options
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
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data),
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
