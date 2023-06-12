const crypto = require('crypto');
const https = require('https');
const retry = require('async-retry');
const { Buffer } = require('buffer');

const {
  Datatypes,
  errors,
  cageLock,
  environment,
  validationHelper,
  httpsHelper,
  cageAttest,
  regexHelper,
} = require('./utils');
const Config = require('./config');
const { Crypto, Http, RelayOutboundConfig } = require('./core');

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
    this.apiKey = apiKey;

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption[curve].ecdhCurve)
    );

    this._shouldOverloadHttpModule(options, apiKey);
  }

  async enableCagesBeta(cagesAttestationData) {
    if (cageAttest.hasAttestationBindings()) {
      await cageAttest.trustCagesRootCA(this.http);
      cageAttest.addAttestationListener(this.config.http, cagesAttestationData);
    } else {
      console.error(
        'EVERVAULT ERROR :: Cannot enable Cages Beta without installing the Evervault attestation bindings'
      );
    }
  }

  async generateNonce() {
    const nonce = await this.crypto.generateBytes(16);
    return nonce.toString('base64').replaceAll(/=|\//g, '');
  }

  async _shouldOverloadHttpModule(options, apiKey) {
    // DEPRECATED: Remove this method in next major version
    if (options.intercept || options.ignoreDomains) {
      console.warn(
        '\x1b[43m\x1b[30mWARN\x1b[0m The `intercept` and `ignoreDomains` config options in the Evervault Node.js SDK are deprecated and slated for removal.',
        '\n\x1b[43m\x1b[30mWARN\x1b[0m More details: https://docs.evervault.com/reference/nodejs-sdk#evervaultenableoutboundrelay'
      );
    } else if (options.intercept !== false && options.enableOutboundRelay) {
      // ^ preserves backwards compatibility with if relay is explictly turned off
      console.warn(
        '\x1b[43m\x1b[30mWARN\x1b[0m The `enableOutboundRelay` config option in the Evervault Node.js SDK is deprecated and slated for removal.',
        '\n\x1b[43m\x1b[30mWARN\x1b[0m You can now use the `enableOutboundRelay()` method to enable outbound relay.',
        '\n\x1b[43m\x1b[30mWARN\x1b[0m More details: https://docs.evervault.com/reference/nodejs-sdk#evervaultenableoutboundrelay'
      );
      await RelayOutboundConfig.init(
        this.config,
        this.http,
        Boolean(options.debugRequests)
      );
    }
    if (options.decryptionDomains && options.decryptionDomains.length > 0) {
      const decryptionDomainsFilter = this._decryptionDomainsFilter(
        options.decryptionDomains.map(regexHelper.buildDomainRegexFromPattern)
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
    } else if (options.enableOutboundRelay) {
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
    const functionsHost = new URL(this.config.http.functionRunUrl).host;
    const caHost = new URL(this.config.http.certHostname).host;
    const apiHost = new URL(this.config.http.baseUrl).host;
    const cagesCaHost = new URL(this.config.http.cagesCertHostname).host;
    const cagesHost = this.config.http.cagesHostname;

    return [functionsHost, cagesCaHost, caHost, apiHost, cagesHost];
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

  _decryptionDomainsFilter(decryptionDomainRegexes) {
    return (domain) =>
      this._isDecryptionDomain(
        domain,
        decryptionDomainRegexes,
        this._alwaysIgnoreDomains()
      );
  }

  _isDecryptionDomain(domain, decryptionDomainRegexes, alwaysIgnore) {
    if (alwaysIgnore.includes(domain)) return false;
    return decryptionDomainRegexes.some((decryptionDomainRegex) =>
      domain.match(decryptionDomainRegex)
    );
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
        RelayOutboundConfig.getDecryptionDomainRegexes(),
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
      this._ecdh.getPublicKey(null, 'compressed')
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
   * @param {String} functionName
   * @param {Object} payload
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async run(functionName, payload, options = {}) {
    validationHelper.validatePayload(payload);
    validationHelper.validateFunctionName(functionName);
    validationHelper.validateOptions(options);

    if (this.retry) {
      const response = await retry(
        async () => {
          return await this.http.runCage(functionName, payload, options);
        },
        { retries: 3 }
      );
      return response.body;
    } else {
      const response = await this.http.runCage(functionName, payload, options);
      return response.body;
    }
  }

  /**
   * @param {String} functionName
   * @param {Object} data
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async encryptAndRun(functionName, data, options) {
    console.warn(
      '\x1b[43m\x1b[30mWARN\x1b[0m The `encrypt_and_run` method is deprecated and slated for removal. Please use the `encrypt` and `run` methods instead.'
    );
    validationHelper.validatePayload(data);
    validationHelper.validateFunctionName(functionName);
    validationHelper.validateOptions(options);

    const payload = await this.encrypt(data);

    return await this.run(functionName, payload, options);
  }

  /**
   * @param {String} functionName
   * @param {Object} payload
   * @returns {Promise<*>}
   */
  async createRunToken(functionName, payload) {
    validationHelper.validatePayload(payload);
    validationHelper.validateFunctionName(functionName);

    const response = await this.http.createRunToken(functionName, payload);
    return response.body;
  }

  async enableOutboundRelay(options = {}) {
    validationHelper.validateRelayOutboundOptions(options);
    if (!options || !options.decryptionDomains) {
      let debug_request;
      if (options && options.debugRequests) {
        debug_request = Boolean(options.debugRequests);
      } else {
        debug_request = false;
      }
      await RelayOutboundConfig.init(this.config, this.http);
      await this.httpsHelper.overloadHttpsModule(
        this.apiKey,
        this.config.http.tunnelHostname,
        this._relayOutboundConfigDomainFilter(),
        debug_request,
        this.http,
        originalRequest
      );
    } else {
      const decryptionDomainsFilter = this._decryptionDomainsFilter(
        options.decryptionDomains.map(regexHelper.buildDomainRegexFromPattern)
      );
      await this.httpsHelper.overloadHttpsModule(
        this.apiKey,
        this.config.http.tunnelHostname,
        decryptionDomainsFilter,
        Boolean(options.debugRequests),
        this.http,
        originalRequest
      );
    }
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
