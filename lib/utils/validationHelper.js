const { errors } = require('./errors');
const Datatypes = require('./datatypes');

const validatePayload = (payload) => {
  if (!Datatypes.isObjectStrict(payload)) {
    throw new errors.EvervaultError('Cages must be given an object to run');
  }
};

const validateCageName = (cageName) => {
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

module.exports = {
  validatePayload,
  validateCageName,
  validateOptions,
};
