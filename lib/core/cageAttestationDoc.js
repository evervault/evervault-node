const RepeatedTimer = require('./repeatedTimer');

let polling = null;
let attestationDocCache = null;

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

const reloadCageDoc = async (cageName, appUuid, http) => {
  const response = await http.getCageAttestationDoc(cageName, appUuid);
  attestationDocCache[cageName] = response.attestation_doc;
};

const get = (cageName) => {
  return attestationDocCache[cageName];
};

const init = async (config, http, cages, appUuid) => {
  this.cages = cages;
  this.appUuid = appUuid.replace(/_/g, '-');
  let pollingInterval = config.http.attestationDocPollInterval;

  if (!attestationDocCache) {
    await _getAttestationDocs(http)();
  }

  if (!polling) {
    polling = RepeatedTimer(pollingInterval, _getAttestationDocs(http));
  }
};

const clearCache = () => {
  attestationDocCache = null;
};

const _getAttestationDocs = (http) => async () => {
  let cache = {};
  await Promise.all(
    this.cages.map(async (cageName) => {
      const response = await http.getCageAttestationDoc(cageName, this.appUuid);
      cache[cageName] = response.attestation_doc;
    })
  );
  attestationDocCache = cache;
};

module.exports = {
  init,
  get,
  disablePolling,
  getPollingInterval,
  reloadCageDoc,
  clearCache,
};
