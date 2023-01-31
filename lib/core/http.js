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
  const post = (path, data, headers = { 'Content-Type': 'application/json' }) =>
    request('POST', path, headers, data);

  const getCageKey = async () => {
    return JSON.parse(
      '{"teamUuid":"team_fc26733f1539","key":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA410o0Ja4AmZnIZQrqj6pLsGrr8QUcKmTWzt2O7XdqRDkp/zm8i79HDZihezlO/cRO6JZZ6vRPLuHBvT2MGS1PS3TcAkxPFBarR4VS8DfIXbelJTInBRFheJhuC8fUG5OiLkneulYK3u0IffVbV6eqrY/pKy8gpaj3e8PsQWXyv9AUB6u3dncNyToS7yc85RQUkLitCnwPvovwfMlZLAQMWs8SvwT08y19El2EA1xMFFrylcNtkfAVillG+qNf8OaiOg5kPD+fJ0692zZY7IQL5tKZa+jiaZbryOEp9KBJ6LRtClbPZS9zYcRE9vQetHrfpcmhoUcZznLH6u/YAc9DQIDAQAB","ecdhKey":"AqSfz7B3aDGhyVlyAgfPTpVW7Gz1NxqnCcCUtL4Y/wLo","ecdhP256Key":"Al1/Mo85D7t/XvC3I+YYpJvP+OsSyxIbSrhtDhg1SClQ","ecdhP256KeyUncompressed":"BF1/Mo85D7t/XvC3I+YYpJvP+OsSyxIbSrhtDhg1SClQ2xdoyGpXYrplO/f8AZ+7cGkUnMF3tzSfLC5Io8BuNyw="}'
    );
  };

  const getCert = async () => {
    const response = await phin({
      url: config.certHostname,
      method: 'GET',
      parse: 'cer',
    })
      .catch(() => {
        // Blindly retry
        return phin({
          url: config.certHostname,
          method: 'GET',
          parse: 'cer',
        });
      })
      .catch((err) => {
        throw new errors.CertError(
          `Unable to download cert from ${config.certHostname} (${err.message})`
        );
      });
    return response.body;
  };

  const getRelayOutboundConfig = async () => {
    const response = await get('v2/relay-outbound').catch((e) => {
      throw new errors.RelayOutboundConfigError(
        `An error occoured while retrieving the Relay Outbound configuration: ${e}`
      );
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const pollIntervalHeaderValue = response.headers['x-poll-interval'];
      return {
        pollInterval: isNaN(pollIntervalHeaderValue)
          ? null
          : parseFloat(pollIntervalHeaderValue),
        data: response.body,
      };
    }
    throw errors.mapApiResponseToError(response);
  };

  const buildRunHeaders = ({ version, async }) => {
    const headers = {};
    if (version) {
      headers['x-version-id'] = version;
    }
    if (async) {
      headers['x-async'] = 'true';
    }
    return headers;
  };

  const runCage = (cageName, payload, options = {}) => {
    const optionalHeaders = buildRunHeaders(options);
    return post(
      `${config.cageRunUrl}/${cageName}`,
      {
        ...payload,
      },
      {
        'Content-Type': 'application/json',
        ...optionalHeaders,
      }
    );
  };

  const createRunToken = (cageName, payload) => {
    return post(
      `v2/functions/${cageName}/run-token`,
      {
        ...payload,
      },
      {
        'Content-Type': 'application/json',
      }
    );
  };

  return {
    getCageKey,
    runCage,
    getCert,
    createRunToken,
    getRelayOutboundConfig,
  };
};
