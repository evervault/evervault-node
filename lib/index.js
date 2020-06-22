const { Datatypes } = require('./utils');
const Config = require('./config');

module.exports = (apikey) => {
  if (!Datatypes.isString(apikey)) {
    throw new Error('Invalid api key specified');
  }

  return require('./core')(Config(apikey));
};
