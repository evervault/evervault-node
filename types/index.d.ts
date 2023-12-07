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
    /** @private @type {string} */ private apiKey;
    /** @private @type {string} */ private appId;
    /** @private @type {import('./config')} */ private config;
    /** @private @type {import('./config').SupportedCurve} */ private curve;
    /** @private @type {ReturnType<import('./core/http')>} */ private http;
    /** @private @type {import('./utils/httpsHelper')} */ private httpsHelper;
    /** @private @type {boolean | undefined} */ private retry;
    /** @private @type {ReturnType<import('./core/crypto')>} */ private crypto;
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
     * @private
     * @param {SdkOptions & OutboundRelayOptions} options
     * @param {string} apiKey
     * @returns {Promise<void>}
     */
    private _shouldOverloadHttpModule;
    /** @private @returns {string[]} */
    private _alwaysIgnoreDomains;
    /**
     * @private
     * @param {string[]} decryptionDomains
     * @returns {(domain: string) => boolean}
     */
    private _decryptionDomainsFilter;
    /**
     * @private
     * @param {string} domain
     * @param {string[]} decryptionDomains
     * @param {string[]} alwaysIgnore
     */
    private _isDecryptionDomain;
    /** @private @returns {(domain: string) => boolean} */
    private _relayOutboundConfigDomainFilter;
    /**
     * @private
     * @param {string} domain
     * @param {string[]} exactDomains
     * @param {string[]} endsWithDomains
     * @returns {boolean}
     */
    private _exactOrEndsWith;
    /**
     * @private
     * @param {string | undefined} role
     */
    private _refreshKeys;
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
     * @private
     * @param {string | number | symbol} property
     * @param {*} value
     */
    private defineHiddenProperty;
    createClientSideDecryptToken(payload: any, expiry?: any): Promise<any>;
}
import HttpsProxyAgent = require("./utils/proxyAgent");
import config = require("./config");