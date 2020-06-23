const crypto = require('crypto');

// const formatKey = (key) => {
//   const arr = key.split('\n');
//   return arr.slice(1, arr.length - 2).join('\n');
// };

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

  return {
    getMockCageKey,
  };
};
