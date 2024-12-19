const crypto = require('crypto');
const errors = require('./errors');
const Datatypes = require('./datatypes');

/**
 * @typedef {Object} ValidationOptions
 * @property {boolean} [encryptionMode]
 * @property {string[]} [decryptionDomains]
 * @property {boolean} [debugRequests]
 */

/**
 * @param {string} appUuid
 * @param {string} apiKey
 * @param {ValidationOptions} [options]
 */
const validateApiKey = (appUuid, apiKey, options = {}) => {
  if (options.encryptionMode === true) {
    return;
  }
  if (apiKey === '' || !Datatypes.isString(apiKey)) {
    throw new errors.EvervaultError(
      'The API key must be a string and cannot be empty.'
    );
  }
  if (apiKey.startsWith('ev:key')) {
    // Scoped API key
    const appUuidHash = crypto
      .createHash('sha512')
      .update(appUuid)
      .digest('base64')
      .slice(0, 6);
    const appUuidHashFromApiKey = apiKey.split(':')[4];
    if (appUuidHash !== appUuidHashFromApiKey) {
      throw new errors.EvervaultError(
        `The API key is not valid for app ${appUuid}. Make sure to use an API key belonging to the app ${appUuid}.`
      );
    }
  }
};

/**
 * @param {any} payload
 */
const validatePayload = (payload) => {
  if (
    !Datatypes.isObjectStrict(payload) &&
    (payload != null || payload != undefined)
  ) {
    throw new errors.EvervaultError('Functions must be given an object to run');
  }
};

/**
 * @param {string} functionName
 */
const validateFunctionName = (functionName) => {
  if (!Datatypes.isString(functionName))
    throw new errors.EvervaultError('Function name invalid');
};

/**
 * @param {ValidationOptions} [options]
 */
const validateRelayOutboundOptions = (options = {}) => {
  if (
    (Datatypes.isDefined(options) && !Datatypes.isObjectStrict(options)) ||
    (Datatypes.isDefined(options) &&
      Datatypes.isDefined(options.decryptionDomains) &&
      !Datatypes.isArray(options.decryptionDomains)) ||
    (Datatypes.isDefined(options) &&
      Datatypes.isDefined(options.debugRequests) &&
      !Datatypes.isBoolean(options.debugRequests))
  ) {
    throw new errors.EvervaultError('Invalid options for enableOutboundRelay');
  }
};

module.exports = {
  validateApiKey,
  validatePayload,
  validateFunctionName,
  validateRelayOutboundOptions,
};
