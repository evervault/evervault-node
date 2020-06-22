import { Datatypes } from './utils';
import Config from './config';
import Core from './core';

export default (apikey: string) => {
  if (!Datatypes.isString(apikey)) {
    throw new Error('Invalid api key specified');
  }

  return Core(Config(apikey));
};
