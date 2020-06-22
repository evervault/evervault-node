import { IConfig } from './config.types';
const API_URL: string = 'https://api.evervault.com';

export default (apikey: string): IConfig => ({
  axios: {
    baseUrl: API_URL,
    headers: {
      'API-KEY': apikey,
    },
    responseType: 'json',
  },
  encryption: {
    cipherAlgorithm: 'aes-256-gcm',
    keyLength: 32,
    authTagLength: 16,
    publicHash: 'sha256',
    header: {
      iss: 'evervault',
      version: 1,
    },
  },
});
