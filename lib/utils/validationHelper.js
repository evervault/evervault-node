const crypto = require('crypto');
const errors = require('./errors');
const Datatypes = require('./datatypes');

const validateApiKey = (appUuid, apiKey) => {
  if (apiKey === '' || !Datatypes.isString(apiKey)) {
    throw new errors.InitializationError(
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
      throw new errors.InitializationError(
        `The API key is not valid for app ${appUuid}. Make sure to use an API key belonging to the app ${appUuid}.`
      );
    }
  }
};

const validatePayload = (payload) => {
  if (
    !Datatypes.isObjectStrict(payload) &&
    (payload != null || payload != undefined)
  ) {
    throw new errors.EvervaultError('Functions must be given an object to run');
  }
};

const validateFunctionName = (functionName) => {
  if (!Datatypes.isString(functionName))
    throw new errors.EvervaultError('Function name invalid');
};

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
