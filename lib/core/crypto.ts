import { IEncryptionConfig } from '../config';
import * as crypto from 'crypto';
import * as Datatypes from '../utils/datatypes';
import { v4 as uuid } from 'uuid';

export interface IEncryptOptions {
  preserveObjectShape: Boolean | undefined;
  fieldsToEncrypt: Array<string> | undefined;
}

const generateBytes = (byteLength: number): Buffer =>
  crypto.randomBytes(byteLength);

const DEFAULT_ENCRYPT_OPTIONS: IEncryptOptions = {
  fieldsToEncrypt: undefined,
  preserveObjectShape: true,
};

class CryptoClient {
  private config: IEncryptionConfig;
  constructor(config: IEncryptionConfig) {
    this.config = config;
  }

  encrypt(
    cageName: string,
    key: string,
    data: any,
    options: IEncryptOptions = DEFAULT_ENCRYPT_OPTIONS
  ) {
    if (Datatypes.isUndefined(data)) {
      throw new Error('Data must not be undefined');
    }
    if (!Datatypes.isString(key)) {
      throw new Error('No key supplied to encrypt');
    }

    const cryptoKey = Datatypes.base64ToBuffer(key);
    if (
      Datatypes.isObject(data) &&
      !Datatypes.isArray(data) &&
      options.preserveObjectShape
    ) {
      return this._encryptObject(cageName, cryptoKey, data, options);
    } else {
      return this._encryptString(
        cageName,
        cryptoKey,
        Datatypes.ensureString(data)
      );
    }
  }

  _encryptObject(
    cageName: string,
    cageKey: Buffer,
    data: {
      [key: string]: any;
    },
    { fieldsToEncrypt }: IEncryptOptions
  ) {
    const keys: Array<string> = fieldsToEncrypt || Object.keys(data);
    const result: {
      [key: string]: any;
    } = { ...data };
    for (let key of keys) {
      result[key] = this._encryptString(cageName, cageKey, data[key]);
    }
    return result;
  }

  _encryptString(cageName: string, cageKey: Buffer, str: string) {
    const keyIv = generateBytes(this.config.keyLength / 2);
    const rootKey = generateBytes(this.config.keyLength);
    const cipherOptions: crypto.CipherGCMOptions = {
      authTagLength: this.config.authTagLength,
    };
    const cipher: crypto.CipherGCM = crypto.createCipheriv(
      this.config.cipherAlgorithm,
      rootKey,
      keyIv,
      cipherOptions
    );

    const encryptedBuffer = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const encryptedKey = this._publicEncrypt(cageKey, rootKey);

    return this._format({
      sharedEncryptedKeys: {
        [cageName]: encryptedKey.toString('base64'),
      },
      keyIv: keyIv.toString('base64'),
      encryptedData: encryptedBuffer.toString('base64'),
    });
  }

  _publicEncrypt(
    publicKey: Buffer,
    data: Buffer,
    hash: string = this.config.publicHash
  ) {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        oaepHash: hash,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      data
    );
  }

  _format(obj: object): string {
    const header = Datatypes.utf8ToBase64(JSON.stringify(this.config.header));
    const payload = Datatypes.utf8ToBase64(JSON.stringify(obj));
    return `${header}.${payload}.${uuid()}`;
  }
}

export default (config: IEncryptionConfig) => {
  return new CryptoClient(config);
};
