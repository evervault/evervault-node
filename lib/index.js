const crypto = require('crypto');
const https = require('https');
const retry = require('async-retry');
const { Buffer } = require('buffer');

const {
  Datatypes,
  errors,
  sourceParser,
  cageLock,
  deploy,
  environment,
  validationHelper,
  httpsHelper,
  polling,
} = require('./utils');
const Config = require('./config');
const { Crypto, Http } = require('./core');

const originalRequest = https.request;

class EvervaultClient {
  static CURVES = {
    SECP256K1: 'secp256k1',
    PRIME256V1: 'prime256v1',
  };

  constructor(apiKey, options = {}) {
    if (!Datatypes.isString(apiKey)) {
      throw new errors.InitializationError('API key must be a string');
    }

    if (apiKey.startsWith('pk:')) {
      this.defineHiddenProperty(
        '_ecdhTeamKey',
        Buffer.from(apiKey.slice(3), 'base64')
      );
    }

    this.config = Config(apiKey);

    let curve;
    if (!options.curve || !this.config.encryption[options.curve]) {
      curve = EvervaultClient.CURVES.SECP256K1; //default to old curve
    } else {
      curve = options.curve;
    }

    this.curve = curve;
    this.retry = options.retry;
    this.http = Http(this.config.http);
    this.crypto = Crypto(this.config.encryption[curve], this.http);
    this.httpsHelper = httpsHelper;
    this.pollInterval = this.config.http.pollInterval * 1000;
    this.polling = polling;

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption[curve].ecdhCurve)
    );

    this._shouldOverloadHttpModule(options, apiKey);
  }

  async _shouldOverloadHttpModule(options, apiKey) {
    if (
      options.intercept ||
      options.ignoreDomains ||
      options.decryptionDomains
    ) {
      console.warn(
        '\x1b[43m\x1b[30mWARN\x1b[0m The `intercept` and `ignoreDomains` config options in Evervault Node.js SDK are deprecated and slated for removal.',
        '\n\x1b[43m\x1b[30mWARN\x1b[0m Please switch to the `decryptionDomains` config option.',
        '\n\x1b[43m\x1b[30mWARN\x1b[0m More details: https://docs.evervault.com/reference/nodejs-sdk#evervaultsdk'
      );
    } else if (options.intercept !== false && options.enableOutboundRelay) {
      // ^ preserves backwards compatibility with if relay is explictly turned off
      this.intervalId = await this.polling.pollRelayOutboundConfig(
        this.pollInterval,
        async () => {
          try {
            const configResponse = await this.http.getRelayOutboundConfig(
              Boolean(options.debugRequests)
            );
            this.relayOutboundConfig = Object.values(
              configResponse.outboundDestinations
            ).map((config) => config.destinationDomain);
          } catch (_e) {
            console.error(
              'EVERVAULT :: An error occurred while attempting to refresh the outbound relay config'
            );
          }
        },
        Boolean(options.debugRequests)
      );
    }

    if (options.decryptionDomains && options.decryptionDomains.length > 0) {
      const decryptionDomainsFilter = this._decryptionDomainsFilter(
        options.decryptionDomains
      );
      await this.httpsHelper.overloadHttpsModule(
        apiKey,
        this.config.http.tunnelHostname,
        decryptionDomainsFilter,
        Boolean(options.debugRequests),
        this.http,
        originalRequest
      );
    } else if (
      options.intercept === true ||
      options.relay === true ||
      (options.ignoreDomains && options.ignoreDomains.length > 0)
    ) {
      const ignoreDomainsFilter = this._ignoreDomainFilter(
        options.ignoreDomains
      );
      await this.httpsHelper.overloadHttpsModule(
        apiKey,
        this.config.http.tunnelHostname,
        ignoreDomainsFilter,
        Boolean(options.debugRequests),
        this.http,
        originalRequest
      );
    } else if (
      this.relayOutboundConfig &&
      Object.keys(this.relayOutboundConfig).length > 0
    ) {
      await this.httpsHelper.overloadHttpsModule(
        apiKey,
        this.config.http.tunnelHostname,
        this._relayOutboundConfigDomainFilter(),
        Boolean(options.debugRequests),
        this.http,
        originalRequest
      );
    } else {
      https.request = originalRequest;
    }
  }

  _alwaysIgnoreDomains() {
    const cagesHost = new URL(this.config.http.cageRunUrl).host;
    const caHost = new URL(this.config.http.certHostname).host;
    const apiHost = new URL(this.config.http.baseUrl).host;

    return [cagesHost, caHost, apiHost];
  }

  _parsedDomainsToIgnore(ignoreDomains) {
    ignoreDomains = ignoreDomains.concat(this._alwaysIgnoreDomains());

    let ignoreExact = [];
    let ignoreEndsWith = [];
    ignoreDomains.forEach((domain) => {
      let exact = domain.startsWith('www.') ? domain.slice(4) : domain;
      ignoreExact.push(exact);
      ignoreEndsWith.push('.' + exact);
      ignoreEndsWith.push('@' + exact);
    });
    return [ignoreExact, ignoreEndsWith];
  }

  _decryptionDomainsFilter(decryptionDomains) {
    return (domain) =>
      this._isDecryptionDomain(
        domain,
        decryptionDomains,
        this._alwaysIgnoreDomains()
      );
  }

  _isDecryptionDomain(domain, decryptionDomains, alwaysIgnore) {
    if (alwaysIgnore.includes(domain)) return false;

    return decryptionDomains.some((decryptionDomain) => {
      if (decryptionDomain.charAt(0) === '*') {
        return domain.endsWith(decryptionDomain.substring(1));
      } else {
        return decryptionDomain === domain;
      }
    });
  }

  _ignoreDomainFilter(ignoreDomains = []) {
    const [ignoreExact, ignoreEndsWith] =
      this._parsedDomainsToIgnore(ignoreDomains);

    return (domain) =>
      !this._isIgnoreRequest(domain, ignoreExact, ignoreEndsWith);
  }

  _relayOutboundConfigDomainFilter() {
    return (domain) => {
      return this._isDecryptionDomain(
        domain,
        this.relayOutboundConfig,
        this._alwaysIgnoreDomains()
      );
    };
  }

  _isIgnoreRequest(domain, ignoreExact, ignoreEndsWith) {
    return this._exactOrEndsWith(domain, ignoreExact, ignoreEndsWith);
  }

  _exactOrEndsWith(domain, exactDomains, endsWithDomains) {
    if (exactDomains.includes(domain)) return true;
    for (let end of endsWithDomains) {
      if (domain && domain.endsWith(end)) return true;
    }
    return false;
  }

  _refreshKeys() {
    this._ecdh.generateKeys();
    this.defineHiddenProperty(
      '_ecdhPublicKey',
      this._ecdh.getPublicKey(null, 'compressed').toString('base64')
    );
    if (this.curve === EvervaultClient.CURVES.PRIME256V1) {
      this.defineHiddenProperty(
        '_derivedAesKey',
        this.crypto.getSharedSecret(
          this._ecdh,
          this._ecdhTeamKey,
          this._ecdhPublicKey
        )
      );
    } else {
      this.defineHiddenProperty(
        '_derivedAesKey',
        this._ecdh.computeSecret(this._ecdhTeamKey)
      );
    }
  }

  /**
   * @param {Object || String} data
   * @returns {Promise<Object || String>}
   */
  async encrypt(data) {
    if (!Datatypes.isDefined(this._derivedAesKey)) {
      if (!Datatypes.isDefined(this._ecdhTeamKey)) {
        const result = await this.http.getCageKey();
        const teamKey =
          this.curve === EvervaultClient.CURVES.PRIME256V1
            ? result.ecdhP256Key
            : result.ecdhKey;
        this.defineHiddenProperty(
          '_ecdhTeamKey',
          Buffer.from(teamKey, 'base64')
        );
      }
      this._refreshKeys();
    }
    if (!Datatypes.isDefined(this._refreshInterval)) {
      this.defineHiddenProperty(
        '_refreshInterval',
        setInterval(
          (ref) => {
            ref._refreshKeys();
          },
          this.config.encryption[this.curve].keyCycleMinutes * 60 * 1000,
          this
        ).unref()
      );
    }
    return await this.crypto.encrypt(
      this.curve,
      this._ecdhTeamKey,
      this._ecdhPublicKey,
      this._derivedAesKey,
      data
    );
  }

  /**
   * @param {String} cageName
   * @param {Object} payload
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async run(cageName, payload, options = {}) {
    validationHelper.validatePayload(payload);
    validationHelper.validateCageName(cageName);
    validationHelper.validateOptions(options);

    if (this.retry) {
      const response = await retry(
        async () => {
          return await this.http.runCage(cageName, payload, options);
        },
        { retries: 3 }
      );
      return response.body;
    } else {
      const response = await this.http.runCage(cageName, payload, options);
      return response.body;
    }
  }

  /**
   * @param {String} cageName
   * @param {Function} func
   * @returns {Function}
   */
  cagify(cageName, func) {
    if (!Datatypes.isFunction(func)) {
      throw new errors.EvervaultError(
        'Cagify must be provided with a function to run'
      );
    }
    if (!Datatypes.isString(cageName) || cageName.length === 0) {
      throw new errors.EvervaultError(
        'Cagify must be provided with a cage name to run'
      );
    }

    const { cageHash, functionRequires, functionParameters } =
      sourceParser.parseSource(func);
    if (cageLock.deployCheck(cageName, cageHash)) {
      const { deployedBy, deployedTeam, deployedVersion } =
        deploy.runDeployment(
          cageName,
          func,
          functionParameters,
          functionRequires
        );
      cageLock.addCageToLockfile(
        cageName,
        cageHash,
        deployedBy,
        deployedTeam,
        deployedVersion
      );
    }

    const cageVersion = cageLock.getLatestVersion(cageName);

    return async (...parameters) => {
      const data = {};
      parameters.forEach((param, index) => {
        data[functionParameters[index]] = param;
      });

      const runtimeObject = {
        environment: await this.encrypt(environment.getEnvironment(func)),
        data,
      };

      const result = await this.run(cageName, runtimeObject, {
        'x-cage-version': cageVersion,
      });

      if (result.statusCode === 404 || result.statusCode === 401)
        throw new errors.EvervaultError(
          "API key mismatch: please ensure you have switched to your app's team in the CLI"
        );
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
    validationHelper.validatePayload(data);
    validationHelper.validateCageName(cageName);
    validationHelper.validateOptions(options);

    const payload = await this.encrypt(data);

    return await this.run(cageName, payload, options);
  }

  /**
   * @param {String} cageName
   * @param {Object} payload
   * @returns {Promise<*>}
   */
  async createRunToken(cageName, payload) {
    validationHelper.validatePayload(payload);
    validationHelper.validateCageName(cageName);

    const response = await this.http.createRunToken(cageName, payload);
    return response.body;
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
