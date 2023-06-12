const { regexHelper } = require('../utils');
const RepeatedTimer = require('./repeatedTimer');

let polling = null;
let decryptionDomainsCache = null;
let decryptionDomainsRegexCache = null;

const disablePolling = () => {
  if (polling) {
    polling.stop();
  }
  polling = null;
};

const getPollingInterval = () => {
  if (polling) {
    return polling.getInterval();
  }
  return null;
};

const clearCache = () => {
  decryptionDomainsCache = null;
  decryptionDomainsRegexCache = null;
};

const getDecryptionDomains = () => {
  return decryptionDomainsCache;
};

const getDecryptionDomainRegexes = () => {
  return decryptionDomainsRegexCache;
};

const init = async (config, http) => {
  let pollingInterval = config.http.pollInterval;

  const getRelayOutboundConfigFromApi = async () => {
    const configResponse = await http.getRelayOutboundConfig();
    if (configResponse.pollInterval) {
      pollingInterval = configResponse.pollInterval;
      if (polling) {
        polling.updateInterval(configResponse.pollInterval);
      }
    }
    decryptionDomainsCache = Object.values(
      configResponse.data.outboundDestinations
    ).map((config) => config.destinationDomain);
    decryptionDomainsRegexCache = decryptionDomainsCache.map(
      regexHelper.buildDomainRegexFromPattern
    );
  };

  /* Initialization */
  if (!decryptionDomainsCache) {
    await getRelayOutboundConfigFromApi();
  }

  if (!polling) {
    polling = RepeatedTimer(pollingInterval, getRelayOutboundConfigFromApi);
  }
};

module.exports = {
  init,
  getDecryptionDomains,
  getDecryptionDomainRegexes,
  disablePolling,
  getPollingInterval,
  clearCache,
};
