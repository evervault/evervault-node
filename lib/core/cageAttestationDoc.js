const RepeatedTimer = require('./repeatedTimer');

let polling = null;
let attestationDocCache = null;

class AttestationDoc {
  constructor(config, http, cages, appUuid) {
    this.appUuid = appUuid.replace(/_/g, '-');
    this.http = http;
    this.cages = cages;
    this.config = config;
    this.polling = null;
    this.attestationDocCache = null;
  }

  disablePolling = () => {
    if (this.polling) {
      this.polling.stop();
    }
    this.polling = null;
  };

  getPollingInterval = () => {
    if (this.polling) {
      return this.polling.getInterval();
    }
    return null;
  };

  reloadCageDoc = async (cageName, appUuid, http) => {
    const response = await this.http.getCageAttestationDoc(cageName, appUuid);
    this.attestationDocCache[cageName] = response.attestation_doc;
  };

  get = (cageName) => {
    return this.attestationDocCache[cageName];
  };

  init = async () => {
    let pollingInterval = this.config.http.attestationDocPollInterval;

    if (!attestationDocCache) {
      await this._getAttestationDocs();
    }

    if (!this.polling) {
      this.polling = RepeatedTimer(pollingInterval, this._getAttestationDocs);
    }
  };

  clearCache = () => {
    this.attestationDocCache = null;
  };

  _getAttestationDocs = async () => {
    let cache = {};
    await Promise.all(
      this.cages.map(async (cageName) => {
        const response = await this.http.getCageAttestationDoc(
          cageName,
          this.appUuid
        );
        cache[cageName] = response.attestation_doc;
      })
    );
    this.attestationDocCache = cache;
  };
}

module.exports = AttestationDoc;
