declare function _exports(config: any): {
    encrypt: (curve: any, ecdhTeamKey: any, ecdhPublicKey: any, derivedSecret: any, data: any, role?: any, options?: {
        preserveObjectShape: boolean;
        fieldsToEncrypt: any;
    }) => Promise<any>;
    getSharedSecret: (ecdh: any, publicKey: any, ephemeralPublicKey: any, curveName: any) => Buffer;
    generateBytes: (byteLength: any) => Promise<any>;
    buildCipherBuffer: (data: any, role: any) => Buffer;
    buildEncodedMetadata: (role: any, encryptionTimestamp: any) => Buffer;
};
export = _exports;
