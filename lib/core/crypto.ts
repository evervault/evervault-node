import { IEncryptionConfig } from '../config';
import * as crypto from 'crypto';
import * as Datatypes from '../utils/datatypes';
import { v4 as uuid } from 'uuid';

export interface IEncryptOptions {
  preserveObjectShape?: Boolean;
  fieldsToEncrypt?: Array<string>;
}

type Encryptable = object | string | number | Buffer | Function;

const generateBytes = (byteLength: number): Buffer =>
  crypto.randomBytes(byteLength);

const DEFAULT_ENCRYPT_OPTIONS: IEncryptOptions = {
  fieldsToEncrypt: undefined,
  preserveObjectShape: true,
};

export default (config: IEncryptionConfig) => {
  const encrypt = (
    cageName: string,
    key: string,
    data: Encryptable,
    options: IEncryptOptions = DEFAULT_ENCRYPT_OPTIONS
  ): object | string => {
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
      return encryptObject(cageName, cryptoKey, data as object, options);
    } else {
      return encryptString(cageName, cryptoKey, Datatypes.ensureString(data));
    }
  };

  const encryptObject = (
    cageName: string,
    cageKey: Buffer,
    data: {
      [key: string]: any;
    },
    { fieldsToEncrypt }: IEncryptOptions
  ): object | string => {
    const keys: Array<string> = fieldsToEncrypt || Object.keys(data);
    const encryptedObject: {
      [key: string]: any;
    } = { ...data };
    for (let key of keys) {
      encryptedObject[key] = encryptString(cageName, cageKey, data[key]);
    }
    return encryptedObject;
  };

  const encryptString = (
    cageName: string,
    cageKey: Buffer,
    str: string
  ): string => {
    const keyIv = generateBytes(config.keyLength / 2);
    const rootKey = generateBytes(config.keyLength);
    const cipherOptions: crypto.CipherGCMOptions = {
      authTagLength: config.authTagLength,
    };
    const cipher: crypto.CipherGCM = crypto.createCipheriv(
      config.cipherAlgorithm,
      rootKey,
      keyIv,
      cipherOptions
    );

    const encryptedBuffer = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const encryptedKey = publicEncrypt(cageKey, rootKey);

    return format({
      sharedEncryptedKeys: {
        [cageName]: encryptedKey.toString('base64'),
      },
      keyIv: keyIv.toString('base64'),
      encryptedData: encryptedBuffer.toString('base64'),
    });
  };

  const publicEncrypt = (publicKey: Buffer, data: Buffer): Buffer => {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        oaepHash: config.publicHash,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      data
    );
  };

  const format = (obj: object): string => {
    const header = Datatypes.utf8ToBase64(JSON.stringify(config.header));
    const payload = Datatypes.utf8ToBase64(JSON.stringify(obj));
    return `${header}.${payload}.${uuid()}`;
  };

  return { encrypt };
};
