import * as crypto from 'crypto';
import * as http from 'http';
import https from 'https';
import type { AgentOptions } from 'https';
import retry from 'async-retry';
import { Buffer } from 'buffer';

import {
  Datatypes,
  errors,
  validationHelper,
  httpsHelper,
  attest,
} from './utils';
import config from './config';
import {
  Crypto,
  Http,
  RelayOutboundConfig,
  AttestationDoc,
  PcrManager,
} from './core';
import { TokenCreationError } from './utils/errors';
import HttpsProxyAgent from './utils/proxyAgent';
import { importTarget, matchTarget } from './utils/domainTargets';
import type { Target } from './utils/domainTargets';
import type {
  MasterConfig,
  SdkOptions,
  OutboundRelayOptions,
  SupportedCurve,
  AttestationData,
  AttestationCallback,
  AttestationBindings,
} from './types';

const originalRequest = https.request;
// Tracks whether this process has overloaded `https.request` for Relay. We only
// restore the original request when we were the ones who replaced it, so that a
// plain client never clobbers an unrelated `https.request` (e.g. a test's nock).
let httpsRequestOverloaded = false;

type Timer = ReturnType<typeof import('./core/repeatedTimer').default>;

class EvervaultClient {
  static CURVES: {
    readonly SECP256K1: SupportedCurve;
    readonly PRIME256V1: SupportedCurve;
  } = {
    SECP256K1: 'secp256k1',
    PRIME256V1: 'prime256v1',
  };

  private _backgroundJobs: {
    enclaves: Timer[] | null;
    relayOutbound: Timer | null;
  };
  private apiKey?: string;
  private appId: string;
  private config: MasterConfig;
  private curve: SupportedCurve;
  private http: ReturnType<typeof Http>;
  private httpsHelper: typeof httpsHelper;
  private retry?: boolean;
  private crypto: ReturnType<typeof Crypto>;
  private encryptionMode?: boolean;

  // Hidden properties defined via defineHiddenProperty (Object.defineProperty).
  private _ecdhTeamKey?: any;
  private _ecdh?: any;
  private _ecdhPublicKey?: any;
  private _derivedAesKey?: any;
  private _refreshInterval?: any;

  constructor(
    appId: string,
    apiKey: string | undefined = undefined,
    options: Partial<SdkOptions & OutboundRelayOptions> = {}
  ) {
    if (
      appId === '' ||
      !Datatypes.isString(appId) ||
      !appId.startsWith('app_')
    ) {
      throw new errors.EvervaultError(
        'The provided App ID is invalid. The App ID can be retrieved in the Evervault dashboard (App Settings).'
      );
    }

    validationHelper.validateApiKey(appId, apiKey, options);

    if (apiKey && apiKey.startsWith('pk:')) {
      this.defineHiddenProperty(
        '_ecdhTeamKey',
        Buffer.from(apiKey.slice(3), 'base64')
      );
    }
    this.config = config;
    let curve: SupportedCurve;
    if (!options.curve || !this.config.encryption[options.curve]) {
      curve = EvervaultClient.CURVES.SECP256K1; //default to old curve
    } else {
      curve = options.curve;
    }

    if (
      options.httpAgent != null &&
      !(options.httpAgent instanceof http.Agent)
    ) {
      throw new errors.EvervaultError(
        'options.httpAgent must be an instance of http.Agent'
      );
    }

    if (
      options.httpsAgent != null &&
      !(options.httpsAgent instanceof https.Agent)
    ) {
      throw new errors.EvervaultError(
        'options.httpsAgent must be an instance of https.Agent'
      );
    }

    this.curve = curve;
    this.retry = options.retry;
    this.http = Http(appId, apiKey as string, this.config.http, {
      httpAgent: options.httpAgent,
      httpsAgent: options.httpsAgent,
    });
    this.crypto = Crypto(this.config.encryption[curve]);
    this.httpsHelper = httpsHelper;
    this.apiKey = apiKey;
    this.appId = appId;
    this._backgroundJobs = {
      relayOutbound: null,
      enclaves: null,
    };
    this.encryptionMode = options.encryptionMode;

    this.defineHiddenProperty(
      '_ecdh',
      crypto.createECDH(this.config.encryption[curve].ecdhCurve)
    );

    this._shouldOverloadHttpModule(options, apiKey);
  }

  async enableEnclaves(
    attestationData: Record<string, AttestationData | AttestationCallback>,
    attestationBindings: AttestationBindings
  ) {
    validationHelper.validateApiKey(this.appId, this.apiKey);
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

  async createEnclaveHttpsAgent(
    attestationData: Record<string, AttestationData | AttestationCallback>,
    attestationBindings: AttestationBindings,
    options?: AgentOptions
  ) {
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

  async generateNonce(): Promise<string> {
    const nonce = await this.crypto.generateBytes(16);
    return nonce.toString('base64').replaceAll(/=|\//g, '');
  }

  private async _shouldOverloadHttpModule(
    options: Partial<SdkOptions & OutboundRelayOptions>,
    apiKey?: string
  ): Promise<void> {
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
      httpsRequestOverloaded = true;
    } else if (options.enableOutboundRelay) {
      await this.httpsHelper.overloadHttpsModule(
        apiKey,
        this.config.http.tunnelHostname,
        this._relayOutboundConfigDomainFilter(),
        Boolean(options.debugRequests),
        this.http,
        originalRequest
      );
      httpsRequestOverloaded = true;
    } else if (httpsRequestOverloaded) {
      (https as any).request = originalRequest;
      httpsRequestOverloaded = false;
    }
  }

  private _alwaysIgnoreDomains(): string[] {
    const caHost = new URL(this.config.http.certHostname).host;
    const apiHost = new URL(this.config.http.baseUrl).host;

    return [caHost, apiHost, this.config.http.enclavesHostname];
  }

  private _decryptionDomainsFilter(
    decryptionDomains: string[]
  ): (domain: string, path: string) => boolean {
    const parsedDomains = decryptionDomains
      .map((decryptionDomain) => importTarget(decryptionDomain))
      .filter(
        (importedTarget): importedTarget is Target => importedTarget != null
      );
    return (domain: string, path: string) =>
      this._isDecryptionDomain(
        domain,
        path,
        parsedDomains,
        this._alwaysIgnoreDomains()
      );
  }

  private _isDecryptionDomain(
    domain: string,
    path: string,
    decryptionDomains: Target[],
    alwaysIgnore: string[]
  ): boolean {
    if (alwaysIgnore.includes(domain)) return false;
    return decryptionDomains.some((decryptionDomain) =>
      matchTarget(domain, path, decryptionDomain)
    );
  }

  private _relayOutboundConfigDomainFilter(): (
    domain: string,
    path: string
  ) => boolean {
    return this._decryptionDomainsFilter(
      RelayOutboundConfig.getDecryptionDomains() as string[]
    ).bind(this);
  }

  private _refreshKeys(role?: string | null) {
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

  async encrypt(data: any, role: string | null = null): Promise<any> {
    const dataRoleRegex = /^[a-z0-9-]{1,20}$/;
    if (role !== null && !dataRoleRegex.test(role)) {
      throw new Error(
        'The provided Data Role slug is invalid. The slug can be retrieved in the Evervault dashboard (Data Roles section).'
      );
    }
    if (!Datatypes.isDefined(this._derivedAesKey)) {
      if (!Datatypes.isDefined(this._ecdhTeamKey)) {
        const result = this.encryptionMode
          ? await this.http.getAppKey()
          : await this.http.getCageKey();
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
          (ref: EvervaultClient) => {
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

  async decrypt(encryptedData: any): Promise<any> {
    validationHelper.validateApiKey(this.appId, this.apiKey);
    return this.http.decrypt(encryptedData);
  }

  async run(functionName: string, payload: any): Promise<any> {
    validationHelper.validateApiKey(this.appId, this.apiKey);
    validationHelper.validateFunctionName(functionName);
    validationHelper.validatePayload(payload);

    if (this.retry) {
      const response = await retry(
        async () => {
          return await this.http.runFunction(functionName, payload);
        },
        { retries: 3 }
      );
      return response.data;
    } else {
      const response = await this.http.runFunction(functionName, payload);
      return response.data;
    }
  }

  async createRunToken(functionName: string, payload: any): Promise<any> {
    validationHelper.validateApiKey(this.appId, this.apiKey);
    validationHelper.validatePayload(payload);
    validationHelper.validateFunctionName(functionName);

    const response = await this.http.createRunToken(functionName, payload);
    return response.data;
  }

  async enableOutboundRelay(options: OutboundRelayOptions = {}): Promise<void> {
    validationHelper.validateApiKey(this.appId, this.apiKey);
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
      httpsRequestOverloaded = true;
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
      httpsRequestOverloaded = true;
    }
  }

  disableOutboundRelay() {
    if (this._backgroundJobs.relayOutbound != null) {
      this._backgroundJobs.relayOutbound.stop();
    }
  }

  createRelayHttpsAgent(): HttpsProxyAgent {
    validationHelper.validateApiKey(this.appId, this.apiKey);
    return this.httpsHelper.httpsRelayAgent(
      {
        hostname: this.config.http.tunnelHostname,
      },
      this.http,
      this.apiKey
    );
  }

  private defineHiddenProperty(property: string | number | symbol, value: any) {
    Object.defineProperty(this, property, {
      enumerable: false,
      configurable: true,
      writable: false,
      value,
    });
  }

  async createClientSideDecryptToken(payload: any, expiry: any = null) {
    validationHelper.validateApiKey(this.appId, this.apiKey);
    if (!payload) {
      throw new TokenCreationError(
        'Payload must be specified when creating a decrypt token'
      );
    }
    return await this.http.createToken('api:decrypt', payload, expiry);
  }
}

export = EvervaultClient;
