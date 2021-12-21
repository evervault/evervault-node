const { errors, async } = require('../utils');
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
    const getRandomEntry = (list) => {
      const idx = Math.floor(Math.random() * list.length);
      return {
        value: list[idx],
        idx
      }
    };

    const getCertFromHostname = (hostname) => {
      return phin({
        url: hostname,
        method: 'GET',
        parse: 'cer',
      })
      .then((response) => response.body)
      .catch((err) => {
        throw new errors.CertError(
          `Unable to download cert from ${config.certHostname} (${err.message})`
        );
      });
    }

    if(config.certHostname.length === 1) {
      return getCertFromHostname(config.certHostname[0]);
    }

    const { value: primaryCertHost, idx } = getRandomEntry(config.certHostname);

    const fallbackHostList = [...config.certHostname];
    fallbackHostList.splice(idx,1);
    const { value: fallbackHost } = getRandomEntry(fallbackHostList);

    const {
      promise: fallbackPromise,
      timeout: fallbackTimeout
    } = async.timeoutPromise(() => {
      return getCertFromHostname(fallbackHost);
    }, 500);

    const primaryHostPromise = getCertFromHostname(primaryCertHost).then((ca) => {
      clearTimeout(fallbackTimeout);
      return ca;
    });

    return async.racePromises(primaryHostPromise, fallbackPromise);
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

  const postMetric = async (count) => {
    const metricsUrl = `metrics/sdkEncryptions?sdk=node&numEncryptions=${count}`;
    try {
      await post(metricsUrl);
    } catch (e) {
      // Ignore errors so they don't affect end users
    }
  };

  let metricsCounter = 0;

  const batchReportMetrics = () => {
    if (metricsCounter > 0) {
      const count = metricsCounter;
      metricsCounter = 0;

      postMetric(count);
    }
  };

  setInterval(batchReportMetrics, 1500).unref();

  process.on('beforeExit', batchReportMetrics);

  const reportMetric = () => {
    metricsCounter += 1;
  };

  return { getCageKey, runCage, getCert, reportMetric };
};
