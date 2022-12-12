const RepeatedTimer = require('./repeatedTimer');

var polling = null;
var decryptionDomainsCache = null;

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
};

const getDecryptionDomains = () => {
  return decryptionDomainsCache;
};

const init = async (config, http) => {
  var pollingInterval = config.http.pollInterval;

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
  disablePolling,
  getPollingInterval,
  clearCache,
};
