const { Datatypes } = require('../utils');
const Http = require('./http');
const Crypto = require('./crypto');

module.exports = (config) => {
  const httpClient = Http(config.http);
  const encryptionClient = Crypto(config.encryption);
  let key;

  const encrypt = async (cageName, data, options) => {
    if (!Datatypes.isDefined(key)) {
      const { key: cageKey } = await httpClient.getCageKey();
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
