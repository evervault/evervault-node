import { Datatypes } from '../utils';
import Http from './http';
import Crypto from './crypto';
import { IConfig } from '../config.types';
import { IEncryptOptions } from './crypto.types';

export default (config: IConfig) => {
  const httpClient = Http(config.axios);
  const encryptionClient = Crypto(config.encryption);
  let key: string;

  const encrypt = async (
    cageName: string,
    data: any,
    options: IEncryptOptions
  ) => {
    if (Datatypes.isUndefined(key)) {
      const cageKey = await httpClient.getCageKey();
      if (Datatypes.isString(cageKey)) {
        key = cageKey;
      } else {
        throw new Error('Invalid Response');
      }
    }

    return await encryptionClient.encrypt(cageName, key, data, options || {});
  };

  return {
    encrypt,
    run: httpClient.runCage,
  };
};
