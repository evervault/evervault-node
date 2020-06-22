const { Datatypes } = require('../utils');
const Http = require('./http');
const Crypto = require('./crypto');

module.exports = (config) => {
  const httpClient = Http(config.axios);
  const encryptionClient = Crypto(config.encryption);
  let key;

  const encrypt = async (cageName, data, options) => {
    if (!Datatypes.isNotUndefined(data)) {
      throw new Error('Data must not be undefined');
    }

    if (!Datatypes.isNotUndefined(key)) {
      const cageKey = await httpClient.getCageKey(apiKey);
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
