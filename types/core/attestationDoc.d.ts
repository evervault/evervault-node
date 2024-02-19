export = AttestationDoc;
declare class AttestationDoc {
    constructor(config: any, http: any, cages: any, appUuid: any, hostname: any);
    appUuid: any;
    http: any;
    cages: any;
    config: any;
    polling: {
        start: () => void;
        stop: () => void;
        isRunning: () => boolean;
        getInterval: () => any;
        updateInterval: (newInterval: any) => void;
    };
    attestationDocCache: {};
    hostname: any;
    disablePolling: () => void;
    getPollingInterval: () => any;
    loadAttestationDoc: (cageName: any) => Promise<void>;
    get: (cageName: any) => any;
    init: () => Promise<{
        start: () => void;
        stop: () => void;
        isRunning: () => boolean;
        getInterval: () => any;
        updateInterval: (newInterval: any) => void;
    }>;
    clearCache: () => void;
    _getAttestationDocs: () => Promise<void>;
}
