import RepeatedTimer from './repeatedTimer';
import type { MasterConfig } from '../types';

let polling: ReturnType<typeof RepeatedTimer> | null = null;
let decryptionDomainsCache: string[] | null = null;

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

const getDecryptionDomains = (): string[] | null => {
  return decryptionDomainsCache;
};

const init = async (config: MasterConfig, http: any) => {
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
    ).map((config: any) => config.destinationDomain);
  };

  /* Initialization */
  if (!decryptionDomainsCache) {
    await getRelayOutboundConfigFromApi();
  }

  if (!polling) {
    polling = RepeatedTimer(pollingInterval, getRelayOutboundConfigFromApi);
  }
  return polling;
};

export {
  init,
  getDecryptionDomains,
  disablePolling,
  getPollingInterval,
  clearCache,
};
