const { Datatypes, errors } = require('./utils');
const Config = require('./config');

const init = (apikey) => {
  if (!Datatypes.isString(apikey)) {
    throw new errors.InitializationError('Api key must be a string');
  }

  return require('./core')(Config(apikey));
};

module.exports = {
  init,
  errors,
};
