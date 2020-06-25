const { Datatypes, errors } = require('./utils');
const Config = require('./config');
const { Crypto, Http } = require('./core');

class EvervaultClient {
  constructor(apikey) {
    if (!Datatypes.isString(apikey)) {
      throw new errors.InitializationError('Api key must be a string');
    }
    this.config = Config(apikey);
    this.crypto = Crypto(this.config.encryption);
    this.http = Http(this.config.http);
  }

  async encrypt(data, options) {
    if (!Datatypes.isDefined(this._cageKey)) {
      const cageKeyResponse = await this.http.getCageKey();
      this.defineHiddenProperty('_cageKey', cageKeyResponse.key);
    }
    return await this.crypto.encrypt(this._cageKey, data, options || {});
  }

  async run(cageName, payload) {
    return await this.http.runCage(cageName, payload);
  }

  async encryptAndRun(cageName, data, options) {
    const payload = await this.encrypt(data, options);
    return await this.run(cageName, payload);
  }

  defineHiddenProperty(property, value) {
    Object.defineProperty(this, property, {
      enumerable: false,
      configurable: false,
      writable: false,
      value,
    });
  }
}

module.exports = EvervaultClient;
