const { errors } = require('../utils');
const phin = require('phin');

module.exports = (config) => {
  /**
   * @param {string} method HTTP method
   * @param {string} path Request path
   * @param {?object} headers Request headers
   * @param {?object} data Request body
   * @returns {Promise<object>} Promise resolving to parsed response
   */
  const request = (method, path, headers = {}, data = undefined) => {
    return phin({
      url: `${config.baseUrl}/${path}`,
      method,
      headers: { ...config.headers, ...headers },
      data,
      parse: config.responseType,
    });
  };

  /**
   * @param {string} path Request path
   * @param {?object} headers Request headers
   * @returns {Promise<object>} Promise resolving to parsed response
   */
  const get = (path, headers) => request('GET', path, headers);

  /**
   * @param {string} path Request path
   * @param {object} data Request body
   * @param {?object} headers Request headers
   * @returns {Promise<object>} Promise resolving to parsed response
   */
  const post = (path, data, headers = { 'Content-Type': 'application/json' }) =>
    request('POST', path, headers, data);

  /**
   * Retrieve a cage encryption key
   * @returns {Promise<object>} Promise resolving to parsed response
   * @throws { AccountError | ApiKeyError | RequestError }
   */
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

  /**
   * @param {string} cageName Name of the cage to run
   * @param {object | string} payload Payload to send into the cage
   * @returns {Promise<object>} Promise resolving to the response from the cage
   * @throws { AccountError | ApiKeyError | RequestError }
   */
  const runCage = (cageName, payload) =>
    post(`cages/${cageName}`, {
      data: payload,
    });

  return { getCageKey, runCage };
};
