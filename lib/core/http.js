const phin = require('phin');

module.exports = (config) => {
  const request = (method, path, headers = {}, data = undefined) => {
    return phin({
      url: `${config.baseUrl}/${path}`,
      method,
      headers: { ...config.headers, ...headers },
      data,
      parse: config.responseType,
    });
  };
  const get = (path, headers) => request('GET', path, headers);
  const post = (path, data, headers = { 'Content-Type': 'application/json' }) =>
    request('POST', path, headers, data);

  const getCageKey = () => get('cages/key').then((response) => response.body);
  const runCage = (cageName, payload) =>
    post(`cages/${cageName}`, {
      data: payload,
    });

  return { getCageKey, runCage };
};
