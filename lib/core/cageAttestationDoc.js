const RepeatedTimer = require('./repeatedTimer');

class AttestationDoc {
  constructor(config, http, cages, appUuid) {
    this.appUuid = appUuid.replace(/_/g, '-');
    this.http = http;
    this.cages = cages;
    this.config = config;
    this.polling = null;
    this.attestationDocCache = {};
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

  loadCageDoc = async (cageName) => {
    const response = await this.http.getCageAttestationDoc(
      cageName,
      this.appUuid
    );
    this.attestationDocCache[cageName] = response.attestation_doc;
  };

  get = async (cageName) => {
    const doc = this.attestationDocCache[cageName];
    if (!doc) {
      await this.loadCageDoc(cageName);
      return this.attestationDocCache[cageName];
    }
    return doc;
  };

  init = async () => {
    let pollingInterval = this.config.http.attestationDocPollInterval;

    await this._getAttestationDocs();

    if (!this.polling) {
      this.polling = RepeatedTimer(pollingInterval, this._getAttestationDocs);
    }
  };

  clearCache = () => {
    this.attestationDocCache = null;
  };

  _getAttestationDocs = async () => {
    await Promise.all(
      this.cages.map(async (cageName) =>
        this.loadCageDoc(cageName, this.appUuid)
      )
    );
  };
}

module.exports = AttestationDoc;
