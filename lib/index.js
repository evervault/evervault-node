const crypto = require('crypto');
const https = require('https');
const retry = require('async-retry');
const { Buffer } = require('buffer');
const util = require('util');

const {
  Datatypes,
  errors,
  validationHelper,
  httpsHelper,
  cageAttest,
} = require('./utils');
const Config = require('./config');
const { Crypto, Http, RelayOutboundConfig, AttestationDoc } = require('./core');
const { TokenCreationError } = require('./utils/errors');
const console = require('console');
const HttpsProxyAgent = require('./utils/proxyAgent');

const originalRequest = https.request;

class EvervaultClient {
  static CURVES = {
    SECP256K1: 'secp256k1',
    PRIME256V1: 'prime256v1',
  };

  constructor(appId, apiKey, options = {}) {
    if (
      appId === '' ||
      !Datatypes.isString(appId) ||
      !appId.startsWith('app_')
    ) {
      throw new errors.InitializationError(
        'The provided App ID is invalid. The App ID can be retrieved in the Evervault dashboard (App Settings).'
      );
    }

    validationHelper.validateApiKey(appId, apiKey);

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
    this.http = Http(appId, apiKey, this.config.http);
    this.crypto = Crypto(this.config.encryption[curve], this.http);
    this.httpsHelper = httpsHelper;
    this.apiKey = apiKey;
    this.appId = appId;

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption[curve].ecdhCurve)
    );

    this._shouldOverloadHttpModule(options, apiKey);
  }

  /**
   * @deprecated use enableCages instead
   */
  async enableCagesBeta(cagesAttestationData) {
    if (cageAttest.hasAttestationBindings()) {
      await cageAttest.trustCagesRootCA(this.http);
      cageAttest.addAttestationListenerBeta(
        this.config.http,
        cagesAttestationData
      );
    } else {
      console.error(
        'EVERVAULT ERROR :: Cannot enable Cages Beta without installing the Evervault attestation bindings'
      );
    }
  }

  async enableCages(cagesAttestationData) {
    if (cageAttest.hasAttestationBindings()) {
      let attestationCache = new AttestationDoc(
        this.config,
        this.http,
        Object.keys(cagesAttestationData),
        this.appId
      );
      await attestationCache.init();
      cageAttest.addAttestationListener(
        this.config.http,
        cagesAttestationData,
        attestationCache
      );
    } else {
      console.error(
        'EVERVAULT ERROR :: Cannot enable Cages without installing the Evervault attestation bindings'
      );
    }
  }

  async generateNonce() {
    const nonce = await this.crypto.generateBytes(16);
    return nonce.toString('base64').replaceAll(/=|\//g, '');
  }

  async _shouldOverloadHttpModule(options, apiKey) {
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

  _relayOutboundConfigDomainFilter() {
    return (domain) => {
      return this._isDecryptionDomain(
        domain,
        RelayOutboundConfig.getDecryptionDomains(),
        this._alwaysIgnoreDomains()
      );
    };
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
   *
   * @param {any} encryptedData
   * @returns {Promise<any>}
   */
  async decrypt(encryptedData) {
    return this.http.decrypt(encryptedData);
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
        options.decryptionDomains
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
  /**
   * @returns {HttpsProxyAgent}
   */
  createRelayHttpsAgent() {
    return this.httpsHelper.httpsRelayAgent(
      {
        hostname: this.config.http.tunnelHostname,
      },
      this.http,
      this.apiKey
    );
  }

  defineHiddenProperty(property, value) {
    Object.defineProperty(this, property, {
      enumerable: false,
      configurable: true,
      writable: false,
      value,
    });
  }

  async createClientSideDecryptToken(payload, expiry = null) {
    if (!payload) {
      throw new TokenCreationError(
        'Payload must be specified when creating a decrypt token'
      );
    }
    return await this.http.createToken('api:decrypt', payload, expiry);
  }
}

module.exports = EvervaultClient;
