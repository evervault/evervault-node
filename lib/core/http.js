const { errors, Datatypes } = require('../utils');

const phin = require('phin');

module.exports = (appUuid, apiKey, config) => {
  const request = (
    method,
    path,
    additionalHeaders = {},
    data = undefined,
    basicAuth = false,
    parse = 'json'
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
      parse,
    });
  };

  const get = (path, headers) => request('GET', path, headers);

  const post = (
    path,
    data,
    headers = { 'Content-Type': 'application/json' },
    basicAuth = false,
    parse = 'json'
  ) => request('POST', path, headers, data, basicAuth, parse);

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

  const decrypt = async (encryptedData) => {
    let contentType;
    let data;
    let parse;
    if (Buffer.isBuffer(encryptedData)) {
      contentType = 'application/octet-stream';
      data = encryptedData;
      parse = 'none';
    } else {
      contentType = 'application/json';
      data = {
        data: encryptedData,
      };
      parse: 'json';
    }
    const response = await post(
      `${config.baseUrl}/decrypt`,
      data,
      {
        'Content-Type': contentType,
      },
      true,
      parse
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (parse === 'json') {
        return response.body.data;
      }
      return response.body;
    }
    throw errors.mapApiResponseToError(response);
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
