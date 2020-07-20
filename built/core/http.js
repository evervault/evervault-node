var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { errors } = require('../utils');
const phin = require('phin');
module.exports = (config) => {
    const request = (method, path, headers = {}, data = undefined) => {
        return phin({
            url: `${config.baseUrl}/${path}`,
            method,
            headers: Object.assign(Object.assign({}, config.headers), headers),
            data,
            parse: config.responseType,
        });
    };
    const get = (path, headers) => request('GET', path, headers);
    const post = (path, data, headers = { 'Content-Type': 'application/json' }) => request('POST', path, headers, data);
    const getCageKey = () => __awaiter(this, void 0, void 0, function* () {
        const response = yield get('cages/key').catch(() => {
            throw new errors.CageKeyError("An error occurred while retrieving the cage's key");
        });
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return response.body;
        }
        throw errors.mapApiResponseToError(response);
    });
    const runCage = (cageName, payload) => post(`cages/${cageName}`, {
        data: payload,
    });
    return { getCageKey, runCage };
};
