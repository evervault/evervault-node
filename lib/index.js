const crypto = require('crypto');
const { Datatypes, errors, sourceParser, cageLock, deploy, environment } = require('./utils');
const Config = require('./config');
const { Crypto, Http, Labs } = require('./core');

class EvervaultClient {
  constructor(apikey, options = {}) {
    if (!Datatypes.isString(apikey)) {
      throw new errors.InitializationError('API key must be a string');
    }
    this.config = Config(apikey);
    this.crypto = Crypto(this.config.encryption);
    this.http = Http(this.config.http);
    
    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption.ecdhCurve)
    );

    this._ecdh.generateKeys();
    
    this.defineHiddenProperty(
      '_ecdhPublicKey',
      this._ecdh.getPublicKey(null, 'compressed').toString('base64')
    );   

    if (options.labs) {
      Object.assign(
        EvervaultClient.prototype, 
        { 
          ...Labs({
            config: this.config,
            http: this.http,
            crypto: this.crypto 
          }) 
        }
      );
    }
  }

  /**
   *
   * @param {Object || String} data
   * @returns {Promise<Object || String>}
   */
  async encrypt(data) {
    if (!Datatypes.isDefined(this._derivedAesKey)) {
      const { ecdhKey } = await this.http.getCageKey();
      this.defineHiddenProperty(
        '_derivedAesKey',
        this._ecdh.computeSecret(Buffer.from(ecdhKey, 'base64'))
      );
    }
    return await this.crypto.encrypt(this._ecdhPublicKey, this._derivedAesKey, data);
  }

  /**
   *
   * @param {String} cageName
   * @param {Object} payload
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async run(cageName, payload, options = {}) {
    if (!Datatypes.isObjectStrict(payload)) {
      throw new errors.EvervaultError('Cages must be given an object to run');
    }
    if (!Datatypes.isString(cageName))
      throw new errors.EvervaultError('Cage name invalid');
    if(
      Datatypes.isObjectStrict(options) &&
      Datatypes.isDefined(options.version) &&
      !Datatypes.isNumber(options.version)
    ) {
      throw new errors.EvervaultError('Cage version must be a number');
    }

    const response = await this.http.runCage(cageName, payload, options);
    return response.body;
  }

  /**
   * @param {String} cageName
   * @param {Function} func
   * @returns {Function}
   */
  cagify(cageName, func) {
    if (!Datatypes.isFunction(func)) {
      throw new errors.EvervaultError('Cagify must be provided with a function to run');
    }
    if (!Datatypes.isString(cageName) || cageName.length === 0) {
      throw new errors.EvervaultError('Cagify must be provided with a cage name to run');
    }

    const { cageHash, functionRequires, functionParameters } = sourceParser.parseSource(func);
    if (cageLock.deployCheck(cageName, cageHash)) {
        const { deployedBy, deployedTeam, deployedVersion } = deploy.runDeployment(cageName, func, functionParameters, functionRequires);
        cageLock.addCageToLockfile(cageName, cageHash, deployedBy, deployedTeam, deployedVersion);
    }

    const cageVersion = cageLock.getLatestVersion(cageName);

    return async (...parameters) => {
        const data = {};
        parameters.forEach((param, index) => {
            data[functionParameters[index]] = param;
        })

        const runtimeObject = {
            environment: await this.encrypt(environment.getEnvironment(func)),
            data
        };

        const result = await this.run(cageName, runtimeObject, {
          'x-cage-version': cageVersion
        });

        if (result.statusCode === 404 || result.statusCode === 401) throw new errors.EvervaultError('API key mismatch: please ensure you have switched to your app\'s team in the CLI');
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

    const payload = await this.encrypt(data);

    return await this.run(cageName, payload, options);
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
