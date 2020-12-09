const crypto = require('crypto');
const { Datatypes, errors, sourceParser, cageLock, deploy, environment } = require('./utils');
const Config = require('./config');
const { Crypto, Http, Labs } = require('./core');

const https = require('https');
class EvervaultClient {
  constructor(apiKey, options = {}) {
    if (!Datatypes.isString(apiKey)) {
      throw new errors.InitializationError('API key must be a string');
    }

    if (apiKey.startsWith('pk:')) {
      this.defineHiddenProperty('_ecdhTeamKey', Buffer.from(apiKey.slice(3), 'base64'))
    }

    this.config = Config(apiKey);
    this.crypto = Crypto(this.config.encryption);
    this.http = Http(this.config.http);

    if (!options.disableTunnel) {
      this._overloadHttpsModule(apiKey, this.config.http.tunnelHostname);
    }

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption.ecdhCurve)
    );

    if (options.labs) {
      Object.assign(
        this.prototype, 
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
   * @param {String} apiKey 
   * @returns {void}
   */
  _overloadHttpsModule(apiKey, tunnelHostname) {
    const originalRequest = https.request; 
    https.request = function wrapMethodRequest(...args) {
      args = args.map(arg => {
        if (arg instanceof URL) {
          if (!arg.href.startsWith(`https://${tunnelHostname}`)) {
            arg = new URL(`https://${tunnelHostname}/?url=${arg.href}`);
          }
        }

        if (arg.hostname && arg.path) {
          arg.path = `/?url=https://${arg.hostname}${arg.path}`;
          arg.hostname = tunnelHostname;
        }

        if (arg.host && arg.path) {
          arg.path = `/?url=https://${arg.host}${arg.path}`;
          arg.host = tunnelHostname;
        }

        if (Object.keys(arg).length > 0) {
          arg.headers = { ...arg.headers, 'x-evervault-api-key': apiKey }
        };

        return arg;
      });

      return originalRequest.apply(this, args);
    }
  }

  /**
   * @param {Object} _this 
   * @returns {void}
   */
  _refreshKeys(_this) {
    _this._ecdh.generateKeys();
    _this.defineHiddenProperty(
      '_ecdhPublicKey',
      _this._ecdh.getPublicKey(null, 'compressed').toString('base64')
    );
    _this.defineHiddenProperty(
      '_derivedAesKey',
      _this._ecdh.computeSecret(_this._ecdhTeamKey)
    );
  }

  /**
   * @param {Object || String} data
   * @returns {Promise<Object || String>}
   */
  async encrypt(data) {
    if (!Datatypes.isDefined(this._derivedAesKey)) {
      if (!Datatypes.isDefined(this._ecdhTeamKey)) {
        const { ecdhKey } = await this.http.getCageKey();
        this.defineHiddenProperty('_ecdhTeamKey', Buffer.from(ecdhKey, 'base64'))
      }
      this._refreshKeys(this);
    }
    if (!Datatypes.isDefined(this._refreshInterval)) {
      this.defineHiddenProperty(
        '_refreshInterval',
        setInterval(this._refreshKeys, this.config.encryption.keyCycleMinutes * 60 * 1000, this).unref()
      )
    }
    return await this.crypto.encrypt(this._ecdhPublicKey, this._derivedAesKey, data);
  }

  /**
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
      configurable: true,
      writable: false,
      value,
    });
  }
}

module.exports = EvervaultClient;
