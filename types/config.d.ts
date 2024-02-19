declare const _exports: MasterConfig;
export = _exports;
export type HttpConfig = {
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
export type CurveConfig = {
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
export type SupportedCurve = "secp256k1" | "prime256v1";
export type CryptoConfig = {
    secp256k1: CurveConfig;
    prime256v1: CurveConfig;
};
export type MasterConfig = {
    http: HttpConfig;
    encryption: CryptoConfig;
};
