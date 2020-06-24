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

  const encryptAndRun = async (cageName, data, options) => {
    const payload = await encrypt(cageName, data, options);
    return await httpClient.runCage(cageName, payload);
  };

  return {
    encrypt,
    run: httpClient.runCage,
    encryptAndRun,
  };
};
