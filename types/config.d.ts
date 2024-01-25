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
declare namespace http {
    let baseUrl: string;
    let userAgent: string;
    let tunnelHostname: string;
    let certHostname: string;
    let cagesCertHostname: string;
    let cagesBetaHostname: string;
    let cagesHostname: string;
    let enclavesHostname: string;
    let pollInterval: string | number;
    let attestationDocPollInterval: string | number;
    let pcrProviderPollInterval: string | number;
}
declare namespace encryption {
    namespace secp256k1 {
        let ecdhCurve: string;
        let keyCycleMinutes: number;
        let cipherAlgorithm: string;
        let keyLength: number;
        let ivLength: number;
        let authTagLength: number;
        let evVersion: string;
        let evVersionWithMetadata: string;
        namespace header {
            let iss: string;
            let version: number;
        }
        let maxFileSizeInMB: string | number;
    }
    namespace prime256v1 {
        let ecdhCurve_1: string;
        export { ecdhCurve_1 as ecdhCurve };
        let keyCycleMinutes_1: number;
        export { keyCycleMinutes_1 as keyCycleMinutes };
        let cipherAlgorithm_1: string;
        export { cipherAlgorithm_1 as cipherAlgorithm };
        let keyLength_1: number;
        export { keyLength_1 as keyLength };
        let ivLength_1: number;
        export { ivLength_1 as ivLength };
        let authTagLength_1: number;
        export { authTagLength_1 as authTagLength };
        let evVersion_1: string;
        export { evVersion_1 as evVersion };
        let evVersionWithMetadata_1: string;
        export { evVersionWithMetadata_1 as evVersionWithMetadata };
        export namespace header_1 {
            let iss_1: string;
            export { iss_1 as iss };
            let version_1: number;
            export { version_1 as version };
        }
        export { header_1 as header };
        let maxFileSizeInMB_1: string | number;
        export { maxFileSizeInMB_1 as maxFileSizeInMB };
    }
}
export {};
