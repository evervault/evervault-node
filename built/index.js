var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { Datatypes, errors } = require('./utils');
const Config = require('./config');
const { Crypto, Http } = require('./core');
class EvervaultClient {
    constructor(apikey) {
        if (!Datatypes.isString(apikey)) {
            throw new errors.InitializationError('Api key must be a string');
        }
        this.config = Config(apikey);
        this.crypto = Crypto(this.config.encryption);
        this.http = Http(this.config.http);
    }
    /**
     *
     * @param data
     * @param options
     * @returns {Promise<*>}
     */
    encrypt(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Datatypes.isDefined(this._cageKey)) {
                const cageKeyResponse = yield this.http.getCageKey();
                this.defineHiddenProperty('_cageKey', Datatypes.formatKey(cageKeyResponse.key));
            }
            return yield this.crypto.encrypt(this._cageKey, data, options || {});
        });
    }
    /**
     *
     * @param cageName
     * @param payload
     * @returns {Promise<*>}
     */
    run(cageName, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.http.runCage(cageName, payload);
            return response.body;
        });
    }
    /**
     *
     * @param cageName
     * @param data
     * @param options
     * @returns {Promise<*>}
     */
    encryptAndRun(cageName, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = yield this.encrypt(data, options);
            return yield this.run(cageName, payload);
        });
    }
    defineHiddenProperty(property, value) {
        Object.defineProperty(this, property, {
            enumerable: false,
            configurable: false,
            writable: false,
            value,
        });
    }
}
module.exports = EvervaultClient;
