const crypto = require('crypto');
const { P256 } = require('../curves');
const Datatypes = require('../utils/datatypes');
const { errors } = require('../utils');
const CRC32 = require('../utils/crc32');
const { pack } = require('msgpackr');

const PRIME256V1 = 'prime256v1';

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
    dataRole,
    data
  ) => {
    return await _traverseObject(
      curve,
      ecdhTeamKey,
      ecdhPublicKey,
      derivedSecret,
      dataRole,
      { ...data }
    );
  };
  const _traverseObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    dataRole,
    data
  ) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        dataRole,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else if (Datatypes.isObjectStrict(data)) {
      const encryptedObject = { ...data };
      for (let [key, value] of Object.entries(encryptedObject)) {
        encryptedObject[key] = await _traverseObject(
          curve,
          ecdhTeamKey,
          ecdhPublicKey,
          derivedSecret,
          dataRole,
          value
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
          dataRole,
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

  const getSharedSecret = (ecdh, publicKey, ephemeralPublicKey) => {
    const secret = ecdh.computeSecret(Buffer.from(publicKey, 'base64'));
    const uncompressedKey = crypto.ECDH.convertKey(
      ephemeralPublicKey,
      'prime256v1',
      'base64',
      'base64',
      'uncompressed'
    );
    const concatSecret = Buffer.concat([
      secret,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      P256.encodePublicKey(uncompressedKey),
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
    dataRole,
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

    if (curve === PRIME256V1) {
      cipher.setAAD(Buffer.from(ecdhTeamKey, 'base64'));
    }

    const metadata = pack({
      dr: dataRole,
      es: 5,
      et: Math.floor(Date.now() / 1000),
    });
    const metadataSize = metadata.length;
    const metadataOffset = Buffer.alloc(2);
    metadataOffset.writeUInt16LE(metadataSize);

    const dataToEncrypt = Buffer.concat([
      metadataOffset,
      metadata,
      Buffer.from(str, 'utf8'),
    ]);

    const encryptedBuffer = Buffer.concat([
      cipher.update(dataToEncrypt, 'utf8'),
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
    encryptedData
  ) => {
    return `ev:${_evVersionPrefix}${
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
    dataRole,
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

    const metadata = pack({
      dr: dataRole,
      es: 5,
      et: Math.floor(Date.now() / 1000),
    });

    const encryptedMetadataBuffer = Buffer.concat([
      cipher.update(metadata),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    const metadataSize = encryptedMetadataBuffer.length;
    const metadataOffset = Buffer.alloc(2);
    metadataOffset.writeUInt16LE(metadataSize);

    const encryptedBuffer = Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return _formatFile(
      keyIv,
      ecdhPublicKey,
      encryptedMetadataBuffer,
      encryptedBuffer
    );
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
    dataRole,
    data,
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
        dataRole,
        data
      );
    } else if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        dataRole,
        data,
        options
      );
    } else if (Datatypes.isArray(data)) {
      return await _traverseObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        dataRole,
        [...data]
      );
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        dataRole,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return { encrypt, getSharedSecret, generateBytes };
};
