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
    const response = await get('cages/key').catch((_e) => {
      throw new errors.CageKeyError(
        "An error occurred while retrieving the cage's key"
      );
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }
    throw errors.mapApiResponseToError(response);
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

  const getRelayOutboundConfig = async (debugRequests) => {
    if (debugRequests) {
      console.log(
        'EVERVAULT DEBUG :: Polling Evervault API for outbound config'
      );
    }
    const response = await get('v2/relay-outbound').catch((e) => {
      throw new errors.RelayOutboundConfigError(
        `An error occoured while retrieving the Relay Outbound configuration: ${e}`
      );
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
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
