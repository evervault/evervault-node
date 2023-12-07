declare function _exports(appUuid: string, apiKey: string, config: import('../config').HttpConfig): {
    getCageKey: () => Promise<any>;
    runFunction: (functionName: any, payload: any) => Promise<phin.IJSONResponse<any>>;
    getCert: () => Promise<any>;
    getCagesCert: () => Promise<any>;
    createRunToken: (functionName: any, payload: any) => Promise<phin.IJSONResponse<any>>;
    getRelayOutboundConfig: () => Promise<{
        pollInterval: number;
        data: any;
    }>;
    decrypt: (encryptedData: any) => Promise<any>;
    createToken: (action: any, payload: any, expiry: any) => Promise<any>;
    getCageAttestationDoc: (cageName: any, appUuid: any) => Promise<any>;
};
export = _exports;
import phin = require("phin");
