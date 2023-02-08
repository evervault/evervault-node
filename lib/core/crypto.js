const crypto = require('crypto');
const { P256 } = require('../curves');
const Datatypes = require('../utils/datatypes');

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
  const _encryptObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data
  ) => {
    return await _traverseObject(
      curve,
      ecdhTeamKey,
      ecdhPublicKey,
      derivedSecret,
      { ...data }
    );
  };
  const _traverseObject = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
    data
  ) => {
    if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
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

  const _evEncryptedFileVersion = () => {
    if (config.ecdhCurve == 'secp256k1') {
      return Buffer.from([0x00]);
    } else if (config.ecdhCurve === 'prime256v1') {
      return Buffer.from([0x01]);
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
    data
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

    return Buffer.concat([
      evEncryptedFileIdentifier,
      versionNumber,
      offsetToData,
      Buffer.from(ecdhPublicKey),
      Buffer.from(keyIv),
      flags,
      Buffer.from(encryptedData),
    ]);
  };

  const encrypt = async (
    curve,
    ecdhTeamKey,
    ecdhPublicKey,
    derivedSecret,
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
        data
      );
    } else if (Datatypes.isObjectStrict(data)) {
      return await _encryptObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        data,
        options
      );
    } else if (Datatypes.isArray(data)) {
      return await _traverseObject(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        [...data]
      );
    } else if (Datatypes.isEncryptable(data)) {
      return await _encryptString(
        curve,
        ecdhTeamKey,
        ecdhPublicKey,
        derivedSecret,
        Datatypes.ensureString(data),
        Datatypes.getHeaderType(data)
      );
    } else {
      throw new Error("Data supplied isn't encryptable");
    }
  };

  return { encrypt, getSharedSecret, generateBytes };
};
