export = EvervaultClient;
declare class EvervaultClient {
    /** @type {{ [curveName: string]: import('./config').SupportedCurve }} */
    static CURVES: {
        [curveName: string]: config.SupportedCurve;
    };
    /**
     * @typedef OutboundRelayOptions
     * @property {string[]} [decryptionDomains]
     * @property {boolean} [debugRequests]
     *
     * @typedef SdkOptions
     * @property {import('./config').SupportedCurve} [curve]
     * @property {boolean} [retry]
     * @property {boolean} [enableOutboundRelay]
     *
     * @param {string} appId
     * @param {string} apiKey
     * @param {SdkOptions & OutboundRelayOptions?} options
     */
    constructor(appId: string, apiKey: string, options?: {
        curve?: import('./config').SupportedCurve;
        retry?: boolean;
        enableOutboundRelay?: boolean;
    } & {
        decryptionDomains?: string[];
        debugRequests?: boolean;
    });
    /** @type {string} */ apiKey: string;
    /** @type {string} */ appId: string;
    /** @type {import('./config')} */ config: {
        http: {
            baseUrl: string;
            userAgent: string;
            tunnelHostname: string;
            certHostname: string;
            cagesCertHostname: string;
            cagesHostname: string;
            pollInterval: string | number;
            attestationDocPollInterval: string | number;
            pcrProviderPollInterval: string | number;
        };
        encryption: {
            secp256k1: {
                ecdhCurve: string;
                keyCycleMinutes: number;
                cipherAlgorithm: string;
                keyLength: number;
                ivLength: number;
                authTagLength: number;
                evVersion: string;
                evVersionWithMetadata: string;
                header: {
                    iss: string;
                    version: number;
                };
                maxFileSizeInMB: string | number;
            };
            prime256v1: {
                ecdhCurve: string;
                keyCycleMinutes: number;
                cipherAlgorithm: string;
                keyLength: number;
                ivLength: number;
                authTagLength: number;
                evVersion: string;
                evVersionWithMetadata: string;
                header: {
                    iss: string;
                    version: number;
                };
                maxFileSizeInMB: string | number;
            };
        };
    };
    /** @type {import('./config').SupportedCurve} */ curve: import('./config').SupportedCurve;
    /** @type {ReturnType<import('./core/http')>} */ http: ReturnType<(appUuid: string, apiKey: string, config: config.HttpConfig) => {
        getCageKey: () => Promise<any>;
        runFunction: (functionName: any, payload: any) => Promise<import("phin").IJSONResponse<any>>;
        getCert: () => Promise<any>;
        getCagesCert: () => Promise<any>;
        createRunToken: (functionName: any, payload: any) => Promise<import("phin").IJSONResponse<any>>;
        getRelayOutboundConfig: () => Promise<{
            pollInterval: number;
            data: any;
        }>;
        decrypt: (encryptedData: any) => Promise<any>;
        createToken: (action: any, payload: any, expiry: any) => Promise<any>;
        getCageAttestationDoc: (cageName: any, appUuid: any) => Promise<any>;
    }>;
    /** @type {import('./utils/httpsHelper')} */ httpsHelper: typeof import("./utils/httpsHelper");
    /** @type {boolean | undefined} */ retry: boolean | undefined;
    crypto: {
        encrypt: (curve: any, ecdhTeamKey: any, ecdhPublicKey: any, derivedSecret: any, data: any, role?: any, options?: {
            preserveObjectShape: boolean;
            fieldsToEncrypt: any;
        }) => Promise<any>;
        getSharedSecret: (ecdh: any, publicKey: any, ephemeralPublicKey: any, curveName: any) => Buffer;
        generateBytes: (byteLength: any) => Promise<any>;
        buildCipherBuffer: (data: any, role: any) => Buffer;
        buildEncodedMetadata: (role: any, encryptionTimestamp: any) => Buffer;
    };
    /**
     * @deprecated use enableCages instead
     */
    enableCagesBeta(cagesAttestationData: any): Promise<void>;
    /**
     * @typedef PCRs
     * @property {string} [pcr0]
     * @property {string} [pcr1]
     * @property {string} [pcr2]
     * @property {string} [pcr8]
     *
     * @param {{ [cageName: string]: PCRs | PCRs[] | (() => Promise<PCRs | PCRs[]>) }} cagesAttestationData
     */
    enableCages(cagesAttestationData: {
        [cageName: string]: {
            pcr0?: string;
            pcr1?: string;
            pcr2?: string;
            pcr8?: string;
        } | {
            pcr0?: string;
            pcr1?: string;
            pcr2?: string;
            pcr8?: string;
        }[] | (() => Promise<{
            pcr0?: string;
            pcr1?: string;
            pcr2?: string;
            pcr8?: string;
        } | {
            pcr0?: string;
            pcr1?: string;
            pcr2?: string;
            pcr8?: string;
        }[]>);
    }): Promise<void>;
    /** @returns {Promise<string>} */
    generateNonce(): Promise<string>;
    /**
     * @param {SdkOptions & OutboundRelayOptions} options
     * @param {string} apiKey
     * @returns {Promise<void>}
     */
    _shouldOverloadHttpModule(options: {
        curve?: import('./config').SupportedCurve;
        retry?: boolean;
        enableOutboundRelay?: boolean;
    } & {
        decryptionDomains?: string[];
        debugRequests?: boolean;
    }, apiKey: string): Promise<void>;
    /** @returns {string[]} */
    _alwaysIgnoreDomains(): string[];
    /**
     * @param {string[]} decryptionDomains
     * @returns {(domain: string) => boolean}
     */
    _decryptionDomainsFilter(decryptionDomains: string[]): (domain: string) => boolean;
    /**
     * @param {string} domain
     * @param {string[]} decryptionDomains
     * @param {string[]} alwaysIgnore
     */
    _isDecryptionDomain(domain: string, decryptionDomains: string[], alwaysIgnore: string[]): boolean;
    /**
     * @returns {(domain: string) => boolean}
     */
    _relayOutboundConfigDomainFilter(): (domain: string) => boolean;
    /**
     * @param {string} domain
     * @param {string[]} exactDomains
     * @param {string[]} endsWithDomains
     * @returns {boolean}
     */
    _exactOrEndsWith(domain: string, exactDomains: string[], endsWithDomains: string[]): boolean;
    /**
     * @param {string | undefined} role
     */
    _refreshKeys(role: string | undefined): void;
    /**
     * @param {Object || String} data
     * @param {String || undefined} role
     * @returns {Promise<Object || String>}
     */
    encrypt(data: any, role?: any): Promise<any>;
    /**
     * @param {any} encryptedData
     * @returns {Promise<any>}
     */
    decrypt(encryptedData: any): Promise<any>;
    /**
     * @param {String} functionName
     * @param {Object} payload
     * @returns {Promise<*>}
     */
    run(functionName: string, payload: any): Promise<any>;
    /**
     * @param {String} functionName
     * @param {Object} payload
     * @returns {Promise<*>}
     */
    createRunToken(functionName: string, payload: any): Promise<any>;
    /**
     * @param {OutboundRelayOptions} options
     */
    enableOutboundRelay(options?: {
        decryptionDomains?: string[];
        debugRequests?: boolean;
    }): Promise<void>;
    /**
     * @returns {HttpsProxyAgent}
     */
    createRelayHttpsAgent(): HttpsProxyAgent;
    /**
     * @param {string | number | symbol} property
     * @param {*} value
     */
    defineHiddenProperty(property: string | number | symbol, value: any): void;
    createClientSideDecryptToken(payload: any, expiry?: any): Promise<any>;
}
import config = require("./config");
import HttpsProxyAgent = require("./utils/proxyAgent");
