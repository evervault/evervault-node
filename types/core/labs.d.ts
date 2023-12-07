declare function _exports({ http, crypto, run }: {
    http: any;
    crypto: any;
    run: any;
}): {
    fetch: (url: any, options: any) => Promise<any>;
};
export = _exports;
