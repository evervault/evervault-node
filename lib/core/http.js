const { errors, Datatypes } = require('../utils');

const phin = require('phin');

module.exports = (appUuid, apiKey, config) => {
  const request = (
    method,
    path,
    additionalHeaders = {},
    data = undefined,
    basicAuth = false
  ) => {
    const headers = {
      'user-agent': config.userAgent,
      ...additionalHeaders,
    };
    if (basicAuth) {
      headers['authorization'] = `Basic ${Buffer.from(
        `${appUuid}:${apiKey}`
      ).toString('base64')}`;
    } else {
      headers['api-key'] = apiKey;
    }
    return phin({
      url: path.startsWith('https://') ? path : `${config.baseUrl}/${path}`,
      method,
      headers,
      data,
      parse: config.responseType,
    });
  };

  const get = (path, headers) => request('GET', path, headers);

  const post = (
    path,
    data,
    headers = { 'Content-Type': 'application/json' },
    basicAuth = false
  ) => request('POST', path, headers, data, basicAuth);

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

  const getCagesCert = async () => {
    const response = await phin({
      url: `${config.cagesCertHostname}/cages-ca.crt`,
      method: 'GET',
      parse: 'cer',
    })
      .catch(() => {
        // Blindly retry
        return phin({
          url: config.cagesCertHostname,
          method: 'GET',
          parse: 'cer',
        });
      })
      .catch((err) => {
        throw new errors.CertError(
          `Unable to download cert from ${config.cagesCertHostname} (${err.message})`
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
      `${config.functionRunUrl}/${cageName}`,
      {
        ...payload,
      },
      {
        'Content-Type': 'application/json',
        ...optionalHeaders,
      }
    );
  };

  const createRunToken = (functionName, payload) => {
    return post(
      `v2/functions/${functionName}/run-token`,
      {
        ...payload,
      },
      {
        'Content-Type': 'application/json',
      }
    );
  };

  const decrypt = (encryptedData) => {
    let contentType = 'application/json';

    return post(
      `${config.baseUrl}/decrypt`,
      {
        data: encryptedData,
      },
      {
        'Content-Type': contentType,
      },
      true
    );
  };

  return {
    getCageKey,
    runCage,
    getCert,
    getCagesCert,
    createRunToken,
    getRelayOutboundConfig,
    decrypt,
  };
};
