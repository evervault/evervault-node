export = AttestationDoc;
declare class AttestationDoc {
    constructor(config: any, http: any, cages: any, appUuid: any);
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
    disablePolling: () => void;
    getPollingInterval: () => any;
    loadCageDoc: (cageName: any) => Promise<void>;
    get: (cageName: any) => any;
    init: () => Promise<void>;
    clearCache: () => void;
    _getAttestationDocs: () => Promise<void>;
}
