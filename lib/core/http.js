const { errors } = require('../utils');
const phin = require('phin');

module.exports = (config) => {
  const request = (method, path, headers = {}, data = undefined, responseType) => {
    return phin({
      url: path.startsWith('https://') ? path : `${config.baseUrl}/${path}`,
      method,
      headers: { ...config.headers, ...headers },
      data,
      parse: responseType ? responseType : config.responseType,
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

  const getDataUrl = async () => {
    const response = await get('cages/upload').catch(() => {
      throw new errors.RequestError('An error occurred while uploading your encrypted file to Evervault Storage.');
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }
    throw errors.mapApiResponseToError(response);
  };

  const uploadData = async (url, data) => {
    const response = await request('PUT', url, {
      'content-type': 'text/plain',
    }, data, true);
    
    if (response.statusCode !== 200) {
      throw new errors.EvervaultError('An error occurred while uploading your encrypted file to Evervault Storage.');
      return false;
    }

    return response;
  }

  const runCage = (cageName, payload, options) =>
    post(`https://cage.run/${cageName}`, {
      ...payload,
    }, {
        'Content-Type': 'application/json',
      ...options
    });

  return { getCageKey, uploadData, getDataUrl, runCage };
};
