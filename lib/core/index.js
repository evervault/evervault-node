const { Datatypes } = require('../utils');
const Http = require('./http');
const Crypto = require('./crypto');

module.exports = (config) => {
  const httpClient = Http(config.http);
  const encryptionClient = Crypto(config.encryption);
  let key;

  /**
   * Encrypt data for use in a cage
   * @param {string} cageName
   * @param {any} data
   * @param {object} options encryption options
   * @param {?boolean} options.preserveObjectShape
   * @param {?string[]} options.fieldsToEncrypt
   * @returns {string | object}
   */
  const encrypt = async (cageName, data, options) => {
    if (!Datatypes.isDefined(key)) {
      ({ key } = await httpClient.getCageKey());
    }

    return await encryptionClient.encrypt(cageName, key, data, options || {});
  };

  /**
   *
   * @param {string} cageName
   * @param {any} data
   * @param {object} options encryption options
   * @param {?boolean} options.preserveObjectShape
   * @param {?string[]} options.fieldsToEncrypt
   * @returns {object} response from running the cage
   */
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
