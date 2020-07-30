const { Datatypes, errors, sourceParser, cageLock, deploy, environment } = require('./utils');
const Config = require('./config');
const { Crypto, Http } = require('./core');

class EvervaultClient {
  constructor(apikey) {
    if (!Datatypes.isString(apikey)) {
      throw new errors.InitializationError('API key must be a string');
    }
    this.config = Config(apikey);
    this.crypto = Crypto(this.config.encryption);
    this.http = Http(this.config.http);
  }

  /**
   *
   * @param {Object || String} data
   * @param {Object} options
   * @returns {Promise<Object || String>}
   */
  async encrypt(data, options) {
    if (!Datatypes.isDefined(this._cageKey)) {
      const cageKeyResponse = await this.http.getCageKey();
      this.defineHiddenProperty(
        '_cageKey',
        Datatypes.formatKey(cageKeyResponse.key)
      );
    }
    return await this.crypto.encrypt(this._cageKey, data, options || {});
  }

  /**
   *
   * @param {String} cageName
   * @param {Object} payload
   * @returns {Promise<*>}
   */
  async run(cageName, payload) {
    if (!Datatypes.isObjectStrict(payload)) {
      throw new errors.EvervaultError('Cages must be given an object to run');
    }
    if (!Datatypes.isString(cageName))
      throw new errors.EvervaultError('Cage name invalid');
    const response = await this.http.runCage(cageName, payload);
    return response.body;
  }

  /**
   * 
   * @param {Function} func
   * @returns {Function}
   */
  cagify(func) {
    if (!Datatypes.isFunction(func)) {
      throw new errors.EvervaultError('Cagify must be provided with a function to run');
    }

    const { cageName, functionRequires, functionParameters } = sourceParser.parseSource(func);

    if (cageLock.deployCheck(cageName)) {
        console.log(`Deploying cage ${cageName}`);
        const { deployedBy, deployedTeam } = deploy.runDeployment(cageName, func, functionParameters, functionRequires);
        cageLock.addCageToLockfile(cageName, deployedBy, deployedTeam);
    }

    return async (...parameters) => {
        const data = {};
        parameters.forEach((param, index) => {
            data[functionParameters[index]] = param;
        })

        const runtimeObject = {
            environment: await this.encrypt(environment.getEnvironment(func)),
            data
        };

        const result = await this.run(cageName, runtimeObject);

        if (result.statusCode === 404) throw new errors.EvervaultError('API key mismatch: please ensure you have switched to your app\'s team in the CLI');
        return result.result;
    };
  }

  /**
   *
   * @param {String} cageName
   * @param {Object} data
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async encryptAndRun(cageName, data, options) {
    if (!Datatypes.isString(cageName)) {
      throw new errors.EvervaultError('Cage name invalid');
    }
    if (!Datatypes.isObjectStrict(data)) {
      throw new errors.EvervaultError('Cages must be given an object to run');
    }

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
