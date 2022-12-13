const errors = require('./errors');
const Datatypes = require('./datatypes');

const validatePayload = (payload) => {
  if (!Datatypes.isObjectStrict(payload)) {
    throw new errors.EvervaultError('Cages must be given an object to run');
  }
};

const validateFunctionName = (cageName) => {
  if (!Datatypes.isString(cageName))
    throw new errors.EvervaultError('Cage name invalid');
};

const validateOptions = (options = {}) => {
  if (
    Datatypes.isObjectStrict(options) &&
    Datatypes.isDefined(options.version) &&
    !Datatypes.isNumber(options.version)
  ) {
    throw new errors.EvervaultError('Cage version must be a number');
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
