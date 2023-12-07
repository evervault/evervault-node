declare function _exports(defaultInterval: any, cb: any): {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
    getInterval: () => any;
    updateInterval: (newInterval: any) => void;
};
export = _exports;
