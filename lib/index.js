const { Datatypes } = require('./utils');
const Config = require('./config');

/**
 *
 *
 * @param {string} apikey your evervault api key.
 * @returns the evervault cages sdk
 * @throws
 */
module.exports = (apikey) => {
  if (!Datatypes.isString(apikey)) {
    throw new Error('Invalid api key specified');
  }

  return require('./core')(Config(apikey));
};
