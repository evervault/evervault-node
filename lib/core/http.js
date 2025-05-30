const { errors, Datatypes } = require('../utils');

const axios = require('axios');

/**
 * @param {string} appUuid
 * @param {string} apiKey
 * @param {import('../types').HttpConfig} config
 */
module.exports = (appUuid, apiKey, config) => {
  const request = (
    method,
    path,
    additionalHeaders = {},
    data = undefined,
    basicAuth = false,
    responseType = 'json'
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

    return axios({
      url:
        path.startsWith('https://') || path.startsWith('http://')
          ? path
          : `${config.baseUrl}/${path}`,
      method,
      headers,
      data,
      validateStatus: (_) => true,
      responseType,
    });
  };

  const get = (path, headers) => request('GET', path, headers);

  const post = (
    path,
    data,
    headers = { 'Content-Type': 'application/json' },
    basicAuth = false,
    responseType = 'json'
  ) => request('POST', path, headers, data, basicAuth, responseType);

  const getCageKey = async () => {
    const getCagesKeyCallback = async () => {
      return await get('cages/key', {}, true).catch((_e) => {
        throw new errors.EvervaultError(
          "An error occurred while retrieving the cage's key"
        );
      });
    };
    const response = await makeGetRequestWithRetry(getCagesKeyCallback);
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw errors.mapResponseCodeToError(response);
  };

  const getAppKey = async () => {
    const getAppKeyCallback = async () => {
      return await get('keys', {
        'x-evervault-app-id': appUuid,
      }).catch((_e) => {
        throw new errors.EvervaultError(
          "An error occurred while retrieving the app's key"
        );
      });
    };
    const response = await makeGetRequestWithRetry(getAppKeyCallback);
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
  };

  const getCert = async () => {
    const response = await makeGetRequestWithRetry(async () =>
      axios(config.certHostname)
    ).catch((err) => {
      throw new errors.EvervaultError(
        `Unable to download cert from ${config.certHostname} (${err.message})`
      );
    });
    return response.data;
  };

  const getAttestationDoc = async (enclaveName, appUuid, hostname) => {
    let url = `https://${enclaveName}.${appUuid}.${
      hostname ? hostname : config.enclavesHostname
    }/.well-known/attestation`;
    const response = await makeGetRequestWithRetry(async () =>
      axios(url)
    ).catch((err) => {
      throw new errors.EvervaultError(
        `Unable to download attestation doc from ${url} (${err.message})`
      );
    });
    return response.data;
  };

  const getRelayOutboundConfig = async () => {
    const response = await get('v2/relay-outbound').catch((e) => {
      throw new errors.EvervaultError(
        `An error occoured while retrieving the Relay Outbound configuration: ${e}`
      );
    });
    if (response.status >= 200 && response.status < 300) {
      const pollIntervalHeaderValue = response.headers['x-poll-interval'];
      return {
        pollInterval: isNaN(pollIntervalHeaderValue)
          ? null
          : parseFloat(pollIntervalHeaderValue),
        data: response.data,
      };
    }
    throw errors.mapResponseCodeToError(response);
  };

  const runFunction = async (functionName, payload) => {
    const response = await post(
      `${config.baseUrl}/functions/${functionName}/runs`,
      {
        payload,
      },
      {
        'Content-Type': 'application/json',
      },
      true
    );

    if (response.status >= 200 && response.status < 300) {
      const responseBody = response.data;
      if (responseBody.status === 'success') {
        return response;
      }
      throw errors.mapFunctionFailureResponseToError(responseBody);
    }

    const responseBody = response.data;
    throw errors.mapApiResponseToError(responseBody);
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

  async function makeGetRequestWithRetry(
    requestCallback,
    maxRetries = 3,
    retryDelay = 250
  ) {
    let retryCount = 0;
    let retryDelayMs = retryDelay;
    let error = null;
    while (retryCount < maxRetries) {
      try {
        return await requestCallback().then((response) => {
          if (response.status < 200 || response.status >= 300) {
            throw new errors.EvervaultError('Unknown error occured');
          } else {
            return response;
          }
        });
      } catch (e) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retryDelayMs *= 2;
        error = e;
      }
    }

    throw error;
  }

  const decrypt = async (encryptedData) => {
    let contentType;
    let data;
    let responseType;
    if (Buffer.isBuffer(encryptedData)) {
      contentType = 'application/octet-stream';
      data = encryptedData;
      responseType = 'arraybuffer';
    } else {
      contentType = 'application/json';
      data = {
        data: encryptedData,
      };
      responseType = 'json';
    }
    const response = await post(
      `${config.baseUrl}/decrypt`,
      data,
      {
        'Content-Type': contentType,
      },
      true,
      responseType
    );
    if (response.status >= 200 && response.status < 300) {
      if (contentType === 'application/json') {
        const { data } = response.data;
        return data;
      }
      return response.data;
    }
    const resBody = Buffer.isBuffer(response.data)
      ? JSON.parse(response.data.toString())
      : response.data;
    throw errors.mapApiResponseToError(resBody);
  };

  const createToken = async (action, payload, expiry) => {
    let wellFormedExpiry;
    if (expiry) {
      if (expiry && expiry instanceof Date) {
        wellFormedExpiry = expiry.getUTCMilliseconds();
      } else if (expiry && typeof expiry === 'number') {
        wellFormedExpiry = expiry;
      } else {
        throw new errors.TokenCreationError(
          `Expiry must be a Date object, got ${typeof expiry}`
        );
      }

      const now = new Date().getUTCMilliseconds();
      if (wellFormedExpiry < now || wellFormedExpiry - now > 600000) {
        throw new errors.TokenCreationError(
          'Expiry must be in the next 10 minutes'
        );
      }
    }

    const response = await post(
      `${config.baseUrl}/client-side-tokens`,
      {
        action,
        payload,
        expiry: wellFormedExpiry,
      },
      {
        'Content-Type': 'application/json',
      },
      true,
      'json'
    );
    if (response.status >= 200 && response.status < 300) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        expiry: new Date(response.data.expiry),
      };
    }
    throw errors.mapApiResponseToError(response.data);
  };

  return {
    getCageKey,
    getAppKey,
    runFunction,
    getCert,
    createRunToken,
    getRelayOutboundConfig,
    decrypt,
    createToken,
    getAttestationDoc,
  };
};
