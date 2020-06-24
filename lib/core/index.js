const { Datatypes } = require('../utils');
const Http = require('./http');
const Crypto = require('./crypto');

module.exports = (config) => {
  const httpClient = Http(config.http);
  const encryptionClient = Crypto(config.encryption);
  let key;

  /**
   * Encrypt data for use in a cage
   * @param {string} cageName Name of the cage to run
   * @param {any} data Data to encrypt for the cage
   * @param {object} options Encryption options
   * @param {?boolean} options.preserveObjectShape If true and data is an object, top level keys are preserved and only values are encrypted. If false, the entire object is encrypted.
   * @param {?string[]} options.fieldsToEncrypt If data is an object, and preserveObjectShape is true, fieldsToEncrypt can be used to only encrypt certain fields. If undefined, all fields are encrypted.
   * @returns {Promise<string | object>} Promise resolving to the encrypted data
   */
  const encrypt = async (cageName, data, options) => {
    if (!Datatypes.isDefined(key)) {
      ({ key } = await httpClient.getCageKey());
    }

    return await encryptionClient.encrypt(cageName, key, data, options || {});
  };

  /**
   *
   * @param {string} cageName Name of cage to run
   * @param {any} data Data to encrypt for the cage
   * @param {object} options Encryption options
   * @param {?boolean} options.preserveObjectShape If true and data is an object, top level keys are preserved and only values are encrypted. If false, the entire object is encrypted.
   * @param {?string[]} options.fieldsToEncrypt If data is an object, and preserveObjectShape is true, fieldsToEncrypt can be used to only encrypt certain fields. If undefined, all fields are encrypted.
   * @returns {Promise<object>} Promise resolving to the response from running the cage
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
