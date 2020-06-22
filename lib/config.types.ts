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
