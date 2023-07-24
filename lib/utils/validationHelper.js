const errors = require('./errors');
const Datatypes = require('./datatypes');

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

const validateOptions = (options = {}) => {
  if (
    Datatypes.isObjectStrict(options) &&
    Datatypes.isDefined(options.version) &&
    !Datatypes.isNumber(options.version)
  ) {
    throw new errors.EvervaultError('Function version must be a number');
  }
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
  validatePayload,
  validateFunctionName,
  validateOptions,
  validateRelayOutboundOptions,
};
