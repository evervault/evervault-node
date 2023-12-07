export let Crypto: (config: any) => {
    encrypt: (curve: any, ecdhTeamKey: any, ecdhPublicKey: any, derivedSecret: any, data: any, role?: any, options?: {
        preserveObjectShape: boolean;
        fieldsToEncrypt: any;
    }) => Promise<any>;
    getSharedSecret: (ecdh: any, publicKey: any, ephemeralPublicKey: any, curveName: any) => Buffer;
    generateBytes: (byteLength: any) => Promise<any>;
    buildCipherBuffer: (data: any, role: any) => Buffer;
    buildEncodedMetadata: (role: any, encryptionTimestamp: any) => Buffer;
};
export let Http: (appUuid: string, apiKey: string, config: import("../config").HttpConfig) => {
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
};
export let Labs: ({ http, crypto, run }: {
    http: any;
    crypto: any;
    run: any;
}) => {
    fetch: (url: any, options: any) => Promise<any>;
};
export let RelayOutboundConfig: typeof import("./relayOutboundConfig");
export let AttestationDoc: typeof import("./cageAttestationDoc");
export let CagePcrManager: typeof import("./cagePcrManager");
