const crypto = require('crypto');
const { parseBase64ToJson, base64ToBuffer } = require('./dataHelpers');

module.exports = () => {
  let keyPair;

  const getMockCageKey = () => {
    if (keyPair) {
      return keyPair.publicKey;
    }
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    return keyPair.publicKey;
  };

  const decrypt = (cageName, data) => {
    const parsedData = parseBase64ToJson(data);

    const encryptionKey = crypto.privateDecrypt(
      {
        key: keyPair.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      base64ToBuffer(parsedData.sharedEncryptedKeys[cageName])
    );

    const { encryptedData, keyIv } = parsedData;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      base64ToBuffer(keyIv)
    );

    const dataBuffer = Buffer.from(encryptedData, 'base64');
    const authTagFirstByte = dataBuffer.byteLength - 16;
    const authTag = dataBuffer.slice(authTagFirstByte);
    const trimmedData = dataBuffer.slice(0, authTagFirstByte);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(
      base64ToBuffer(trimmedData),
      'base64',
      'utf8'
    );
    decrypted += decipher.final('utf8');
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  };

  return {
    getMockCageKey,
    decrypt,
  };
};
