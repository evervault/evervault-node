import { CipherGCMTypes } from 'crypto';
import { AxiosRequestConfig } from 'axios';

export interface IEncryptionConfig {
  cipherAlgorithm: CipherGCMTypes;
  keyLength: number;
  authTagLength: number;
  publicHash: string;
  header: {
    iss: string;
    version: number;
  };
}

export interface IHttpConfig extends AxiosRequestConfig {
  baseUrl: string;
  headers: {
    'API-KEY': string;
  };
  responseType: 'json';
}

export interface IConfig {
  axios: IHttpConfig;
  encryption: IEncryptionConfig;
}

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
