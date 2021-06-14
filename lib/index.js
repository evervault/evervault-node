const crypto = require('crypto');
const { Datatypes, errors, sourceParser, cageLock, deploy, environment } = require('./utils');
const Config = require('./config');
const { Crypto, Http, } = require('./core');
const HttpsProxyAgent = require('https-proxy-agent');
const tls = require("tls");


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

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption.ecdhCurve)
    );

    if (options.relay) {
      if (!options.disableTunnel) {
        this._overloadHttpsModule(apiKey, this.config.http.tunnelHostname);
      }
    }
  }

  /**
   * @param {String} apiKey 
   * @returns {void}
   */
  async _overloadHttpsModule(apiKey, tunnelHostname) {
    let pem = await this.http.getCert();

    const originalRequest = https.request; 
    https.request = function wrapMethodRequest(...args) {
      args = args.map(arg => {
        if (arg instanceof Object) {
          arg.agent = new HttpsProxyAgent(tunnelHostname);
          arg.headers = { ...arg.headers, 'Proxy-Authorization': apiKey };
        }

        return arg;
      });

      return originalRequest.apply(this, args);
    }

    const origCreateSecureContext = tls.createSecureContext;
    tls.createSecureContext = (options) => {
      const context = origCreateSecureContext(options);
      context.context.addCACert(pem);
      return context;
    };
  }

  _refreshKeys() {
    this._ecdh.generateKeys();
    this.defineHiddenProperty(
      '_ecdhPublicKey',
      this._ecdh.getPublicKey(null, 'compressed').toString('base64')
    );
    this.defineHiddenProperty(
      '_derivedAesKey',
      this._ecdh.computeSecret(this._ecdhTeamKey)
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
      this._refreshKeys();
    }
    if (!Datatypes.isDefined(this._refreshInterval)) {
      this.defineHiddenProperty(
        '_refreshInterval',
        setInterval((ref) => { ref._refreshKeys() }, this.config.encryption.keyCycleMinutes * 60 * 1000, this).unref()
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
