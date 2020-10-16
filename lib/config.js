const API_URL = 'https://api.evervault.com';
const KEYS_URL = 'https://keys.evervault.com';

module.exports = (apikey) => ({
  http: {
    baseUrl: API_URL,
    keysUrl: KEYS_URL,
    headers: {
      'API-KEY': apikey,
    },
    responseType: 'json',
  },
  encryption: {
    cipherAlgorithm: 'aes-256-gcm',
    keyLength: 32,
    authTagLength: 16,
    header: {
      iss: 'evervault',
      version: 1,
    },
  },
});
