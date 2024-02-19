export = CagePcrManager;
declare class CagePcrManager {
    constructor(config: any, cagesAttestationData: any);
    store: any;
    config: any;
    polling: {
        start: () => void;
        stop: () => void;
        isRunning: () => boolean;
        getInterval: () => any;
        updateInterval: (newInterval: any) => void;
    };
    disablePolling: () => void;
    getPollingInterval: () => any;
    fetchPcrs: (cageName: any) => Promise<void>;
    get: (cageName: any) => any;
    init: () => Promise<{
        start: () => void;
        stop: () => void;
        isRunning: () => boolean;
        getInterval: () => any;
        updateInterval: (newInterval: any) => void;
    }>;
    clearStoredPcrs: () => void;
    clearStore: () => void;
    _getPcrs: () => Promise<void>;
}
