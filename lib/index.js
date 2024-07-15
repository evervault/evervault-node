const crypto = require('crypto');
const https = require('https');
const retry = require('async-retry');
const { Buffer } = require('buffer');

const {
  Datatypes,
  errors,
  validationHelper,
  httpsHelper,
  attest,
} = require('./utils');
const config = require('./config');
const {
  Crypto,
  Http,
  RelayOutboundConfig,
  AttestationDoc,
  PcrManager,
} = require('./core');
const { TokenCreationError } = require('./utils/errors');
const HttpsProxyAgent = require('./utils/proxyAgent');

const originalRequest = https.request;

class EvervaultClient {
  /** @type {{ [curveName: string]: import('./types').SupportedCurve }} */
  static CURVES = {
    SECP256K1: 'secp256k1',
    PRIME256V1: 'prime256v1',
  };

  /** @typedef {ReturnType<import('./core/repeatedTimer')>} Timer */
  /** @private @type {{ enclaves: Timer[] | null, relayOutbound: Timer | null}} */ _backgroundJobs;

  /** @private @type {string} */ apiKey;
  /** @private @type {string} */ appId;
  /** @private @type {import('./types')} */ config;
  /** @private @type {import('./types').SupportedCurve} */ curve;
  /** @private @type {ReturnType<import('./core/http')>} */ http;
  /** @private @type {import('./utils/httpsHelper')} */ httpsHelper;
  /** @private @type {boolean | undefined} */ retry;
  /** @private @type {ReturnType<import('./core/crypto')>} */ crypto;

  /**
   * @param {string} appId
   * @param {string} apiKey
   * @param {Partial<import('./types').SdkOptions & import('./types').OutboundRelayOptions>} options
   */
  constructor(appId, apiKey, options = {}) {
    if (
      appId === '' ||
      !Datatypes.isString(appId) ||
      !appId.startsWith('app_')
    ) {
      throw new errors.EvervaultError(
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

    this.config = config;

    let curve;
    if (!options.curve || !this.config.encryption[options.curve]) {
      curve = EvervaultClient.CURVES.SECP256K1; //default to old curve
    } else {
      curve = options.curve;
    }

    this.curve = curve;
    this.retry = options.retry;
    this.http = Http(appId, apiKey, this.config.http);
    this.crypto = Crypto(this.config.encryption[curve]);
    this.httpsHelper = httpsHelper;
    this.apiKey = apiKey;
    this.appId = appId;
    this._backgroundJobs = {
      relayOutbound: null,
      enclaves: null,
    };

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption[curve].ecdhCurve)
    );

    this._shouldOverloadHttpModule(options, apiKey);
  }

  /**
   * @param {Record<string, import('./types').AttestationData | import('./types').AttestationCallback>} attestationData
   * @param {import('./types').AttestationBindings} attestationBindings
   * @throws {import('./utils/errors').MalformedAttestationData}
   */
  async enableEnclaves(attestationData, attestationBindings) {
    attest.validateAttestationData(attestationData);
    // Store attestation documents in cache
    let attestationCache = new AttestationDoc(
      this.config,
      this.http,
      Object.keys(attestationData),
      this.appId,
      this.config.http.enclavesHostname
    );

    const attestationCachePollingRef = await attestationCache.init();
    this._backgroundJobs.enclaves = [attestationCachePollingRef];

    //Store client PCR providers to periodically pull new PCRs
    const pcrManager = new PcrManager(this.config, attestationData);

    const pcrManagerPollingRef = await pcrManager.init();
    this._backgroundJobs.enclaves.push(pcrManagerPollingRef);

    attest.addAttestationListener(
      this.config.http,
      attestationCache,
      pcrManager,
      attestationBindings
    );
  }

  disableEnclaves() {
    if (Array.isArray(this._backgroundJobs.enclaves)) {
      this._backgroundJobs.enclaves.forEach((enclaveTimer) => {
        enclaveTimer.stop();
      });
    }
  }

  async createEnclaveHttpsAgent(attestationData, attestationBindings, options) {
    attest.validateAttestationData(attestationData);

    const attestationCache = new AttestationDoc(
      this.config,
      this.http,
      Object.keys(attestationData),
      this.appId,
      this.config.http.enclavesHostname
    );
    const attestationCachePollingRef = await attestationCache.init();
    this._backgroundJobs.enclaves = [attestationCachePollingRef];

    const pcrManager = new PcrManager(this.config, attestationData);
    const pcrManagerPollingRef = await pcrManager.init();
    this._backgroundJobs.enclaves.push(pcrManagerPollingRef);

    return new attest.EnclaveAgent(
      options,
      this.config.http,
      attestationCache,
      pcrManager,
      attestationBindings
    );
  }

  /** @returns {Promise<string>} */
  async generateNonce() {
    const nonce = await this.crypto.generateBytes(16);
    return nonce.toString('base64').replaceAll(/=|\//g, '');
  }

  /**
   * @private
   * @param {Partial<import('./types').SdkOptions & import('./types').OutboundRelayOptions>} options
   * @param {string} apiKey
   * @returns {Promise<void>}
   */
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

  /**
   * @private
   * @returns {string[]}
   */
  _alwaysIgnoreDomains() {
    const caHost = new URL(this.config.http.certHostname).host;
    const apiHost = new URL(this.config.http.baseUrl).host;

    return [caHost, apiHost, this.config.http.enclavesHostname];
  }

  /**
   * @private
   * @param {string[]} decryptionDomains
   * @returns {(domain: string) => boolean}
   */
  _decryptionDomainsFilter(decryptionDomains) {
    return (domain) =>
      this._isDecryptionDomain(
        domain,
        decryptionDomains,
        this._alwaysIgnoreDomains()
      );
  }

  /**
   * @private
   * @param {string} domain
   * @param {string[]} decryptionDomains
   * @param {string[]} alwaysIgnore
   */
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

  /** @private @returns {(domain: string) => boolean} */
  _relayOutboundConfigDomainFilter() {
    return (domain) => {
      return this._isDecryptionDomain(
        domain,
        RelayOutboundConfig.getDecryptionDomains(),
        this._alwaysIgnoreDomains()
      );
    };
  }

  /**
   * @private
   * @param {string} domain
   * @param {string[]} exactDomains
   * @param {string[]} endsWithDomains
   * @returns {boolean}
   */
  _exactOrEndsWith(domain, exactDomains, endsWithDomains) {
    if (exactDomains.includes(domain)) return true;
    for (let end of endsWithDomains) {
      if (domain && domain.endsWith(end)) return true;
    }
    return false;
  }

  /**
   * @private
   * @param {string | undefined} role
   */
  _refreshKeys(role) {
    this._ecdh.generateKeys();
    this.defineHiddenProperty(
      '_ecdhPublicKey',
      this._ecdh.getPublicKey(null, 'compressed')
    );
    if (
      this.curve === EvervaultClient.CURVES.PRIME256V1 ||
      (this.curve === EvervaultClient.CURVES.SECP256K1 && role)
    ) {
      this.defineHiddenProperty(
        '_derivedAesKey',
        this.crypto.getSharedSecret(
          this._ecdh,
          this._ecdhTeamKey,
          this._ecdhPublicKey,
          this.curve
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
   * @param {String || undefined} role
   * @returns {Promise<Object || String>}
   */
  async encrypt(data, role = null) {
    const dataRoleRegex = /^[a-z0-9-]{1,20}$/;
    if (role !== null && !dataRoleRegex.test(role)) {
      throw new Error(
        'The provided Data Role slug is invalid. The slug can be retrieved in the Evervault dashboard (Data Roles section).'
      );
    }
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
      this._refreshKeys(role);
    }
    if (!Datatypes.isDefined(this._refreshInterval)) {
      this.defineHiddenProperty(
        '_refreshInterval',
        setInterval(
          (ref) => {
            ref._refreshKeys(role);
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
      data,
      role
    );
  }

  /**
   * @param {any} encryptedData
   * @returns {Promise<any>}
   */
  async decrypt(encryptedData) {
    return this.http.decrypt(encryptedData);
  }

  /**
   * @param {string} functionName
   * @param {object} payload
   * @returns {Promise<*>}
   */
  async run(functionName, payload) {
    validationHelper.validateFunctionName(functionName);
    validationHelper.validatePayload(payload);

    if (this.retry) {
      const response = await retry(
        async () => {
          return await this.http.runFunction(functionName, payload);
        },
        { retries: 3 }
      );
      return response.body;
    } else {
      const response = await this.http.runFunction(functionName, payload);
      return response.body;
    }
  }

  /**
   * @param {string} functionName
   * @param {object} payload
   * @returns {Promise<*>}
   */
  async createRunToken(functionName, payload) {
    validationHelper.validatePayload(payload);
    validationHelper.validateFunctionName(functionName);

    const response = await this.http.createRunToken(functionName, payload);
    return response.body;
  }

  /**
   * @param {import('./types').OutboundRelayOptions} options
   */
  async enableOutboundRelay(options = {}) {
    validationHelper.validateRelayOutboundOptions(options);
    if (!options || !options.decryptionDomains) {
      let debug_request;
      if (options && options.debugRequests) {
        debug_request = Boolean(options.debugRequests);
      } else {
        debug_request = false;
      }
      const relayOutboundPollingRef = await RelayOutboundConfig.init(
        this.config,
        this.http
      );
      this._backgroundJobs.relayOutbound = relayOutboundPollingRef;
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

  disableOutboundRelay() {
    if (this._backgroundJobs.relayOutbound != null) {
      this._backgroundJobs.relayOutbound.stop();
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

  /**
   * @private
   * @param {string | number | symbol} property
   * @param {*} value
   */
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
