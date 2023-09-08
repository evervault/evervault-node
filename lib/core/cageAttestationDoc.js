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

const getCageAttestationDoc = (cageName) => {
  return attestationDocCache[cageName];
};

const init = async (config, http, cages, appUuid) => {
  let pollingInterval = config.http.attestationDocPollInterval;

  /* Initialization */
  if (!attestationDocCache) {
    await getAttestationDocs(cages, appUuid, http);
  }

  if (!polling) {
    polling = RepeatedTimer(pollingInterval, getAttestationDocs);
  }
};

const getAttestationDocs = async (cages, appUuid, http) => {
  let cache = {};
  await Promise.all(
    cages.map(async (cageName) => {
      const response = await http.getCageAttestationDoc(cageName, appUuid);
      cache[cageName] = response.attestation_doc;
    })
  );
  attestationDocCache = cache;
};

module.exports = {
  init,
  getCageAttestationDoc,
  disablePolling,
  getPollingInterval,
  reloadCageDoc,
};
