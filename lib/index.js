const { Datatypes, errors } = require('./utils');
const Config = require('./config');

/**
 * Initialize the evervault sdk with your api key.
 *
 * @param {string} apikey your evervault api key.
 * @returns the evervault sdk
 * @throws {InitializationError} Provided api key must be a string
 */
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
