const { errors } = require('../utils');
const phin = require('phin');

module.exports = (config) => {
  const request = (method, path, headers = {}, data = undefined) => {
    return phin({
      url: path.substring(0, 8) === 'https://' ? path : `${config.baseUrl}/${path}`,
      method,
      headers: { ...config.headers, ...headers },
      data,
      parse: config.responseType,
    });
  };
  const get = (path, headers) => request('GET', path, headers);
  const post = (path, data, headers = { 'Content-Type': 'application/json' }) => request('POST', path, headers, data);

  const getCageKey = async () => {
    const response = await get('cages/key').catch(() => {
      throw new errors.CageKeyError(
        "An error occurred while retrieving the cage's key"
      );
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }
    throw errors.mapApiResponseToError(response);
  };

  const runCage = (cageName, payload, options) =>
    post(`https://cage.run/${cageName}`, {
      ...payload,
    }, {
        'Content-Type': 'application/json',
      ...options
    });

  return { getCageKey, runCage };
};