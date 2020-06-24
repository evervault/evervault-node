const { Datatypes } = require('../utils');
const Http = require('./http');
const Crypto = require('./crypto');

module.exports = (config) => {
  const httpClient = Http(config.http);
  const encryptionClient = Crypto(config.encryption);
  let key;

  const encrypt = async (cageName, data, options) => {
    if (!Datatypes.isDefined(key)) {
      ({ key } = await httpClient.getCageKey());
    }

    return await encryptionClient.encrypt(cageName, key, data, options || {});
  };

  return {
    encrypt,
    run: httpClient.runCage,
  };
};
