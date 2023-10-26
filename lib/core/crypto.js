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

module.exports = (config) => {
  let MAX_FILE_SIZE_IN_BYTES = config.maxFileSizeInMB * 1024 * 1024;
  const _encryptObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    metadata
  ) => {
    return await _traverseObject(
      curve,
      ecdhTeamKey,
      ecdhPublicKey,
      derivedSecret,
      { ...data },
      metadata
    );
  };
  const _traverseObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data,
    metadata
  ) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data),
        metadata
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
          metadata
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
          metadata
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

  const _encryptString = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    str,
    datatype,
    metadata
  ) => {
    const keyIv = await generateBytes(config.ivLength);
    const hasMetadata = metadata && metadata.role;
    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedSecret,
      keyIv,
      {
        authTagLength: config.authTagLength,
      }
    );
    if (curve === PRIME256V1 || (curve === SECP256K1 && hasMetadata)) {
      cipher.setAAD(Buffer.from(ecdhTeamKey, 'base64'));
    }

    const result = buildCipherBuffer(str, metadata);

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
      hasMetadata
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

  const buildCipherBuffer = (data, metadata) => {
    const hasMetadata = metadata && metadata.role;
    let result;
    if (hasMetadata) {
      const metadataBytes = buildEncodedMetadata(
        metadata.role,
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

  const _evVersionPrefix = (hasMetadata) =>
    base64RemovePadding(
      Buffer.from(
        hasMetadata ? config.evVersionWithMetadata : config.evVersion
      ).toString('base64')
    );

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
    hasMetadata
  ) => {
    return `ev:${_evVersionPrefix(hasMetadata)}${
      datatype !== 'string' ? ':' + datatype : ''
    }:${base64RemovePadding(keyIv)}:${base64RemovePadding(
      ecdhPublicKey.toString('base64')
    )}:${base64RemovePadding(encryptedData)}:$`;
  };

  const _encryptFile = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data
  ) => {
    const fileSizeInBytes = data.length;
    if (fileSizeInBytes > MAX_FILE_SIZE_IN_BYTES) {
      throw new errors.ExceededMaxFileSizeError(
        `File size must be less than ${config.maxFileSizeInMB}MB`
      );
    }
    const keyIv = await generateBytes(config.ivLength);

    const cipher = crypto.createCipheriv(
      config.cipherAlgorithm,
      derivedSecret,
      keyIv,
      {
        authTagLength: config.authTagLength,
      }
    );

    if (curve === PRIME256V1) {
      cipher.setAAD(Buffer.from(ecdhTeamKey, 'base64'));
    }

    const encryptedBuffer = Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return _formatFile(keyIv, ecdhPublicKey, encryptedBuffer);
  };

  const _formatFile = async (keyIv, ecdhPublicKey, encryptedData) => {
    const evEncryptedFileIdentifier = Buffer.from([
      0x25, 0x45, 0x56, 0x45, 0x4e, 0x43,
    ]);
    const versionNumber = _evEncryptedFileVersion();
    const offsetToData = Buffer.from([0x37, 0x00]);
    const flags = Buffer.from([0x00]);

    const fileContents = Buffer.concat([
      evEncryptedFileIdentifier,
      versionNumber,
      offsetToData,
      Buffer.from(ecdhPublicKey),
      Buffer.from(keyIv),
      flags,
      Buffer.from(encryptedData),
    ]);

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
    metadata = undefined,
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
        data
      );
    } else if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        data,
        metadata,
        options
      );
    } else if (Datatypes.isArray(data)) {
      return await _traverseObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        [...data],
        metadata
      );
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data),
        metadata
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
