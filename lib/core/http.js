const { errors } = require('../utils');
const phin = require('phin');

module.exports = (config) => {
  const request = (method, path, headers = {}, data = undefined) => {
    return phin({
      url: path.startsWith('https://') ? path : `${config.baseUrl}/${path}`,
      method,
      headers: { ...config.headers, ...headers },
      data,
      parse: config.responseType,
    });
  };
  const get = (path, headers) => request('GET', path, headers);
  const post = (path, data, headers = { 'Content-Type': 'application/json' }) => request('POST', path, headers, data);

  const getCageKey = async () => {
    const response = await get('cages/key').catch((e) => {
      console.log(e);
      throw new errors.CageKeyError(
        "An error occurred while retrieving the cage's key"
      );
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }
    throw errors.mapApiResponseToError(response);
  };

  const buildRunHeaders = ({ version, async }) => {
    const headers = {};
    if(version){
      headers['x-version-id'] = version;
    }
    if(async){
      headers['x-async'] = 'true';
    }
    return headers;
  }

  const runCage = (cageName, payload, options = {}) => {
    const optionalHeaders = buildRunHeaders(options);
    return post(`${config.cageRunUrl}/${cageName}`, {
      ...payload,
    }, {
      'Content-Type': 'application/json',
      ...optionalHeaders
    });
  }

  return { getCageKey, runCage };
};
