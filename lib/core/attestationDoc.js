const RepeatedTimer = require('./repeatedTimer');

class AttestationDoc {
  constructor(config, http, cages, appUuid, hostname) {
    this.appUuid = appUuid.replace(/_/g, '-');
    this.http = http;
    this.cages = cages;
    this.config = config;
    this.polling = null;
    this.attestationDocCache = {};
    this.hostname = hostname;
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

  loadAttestationDoc = async (cageName) => {
    try {
      const response = await this.http.getAttestationDoc(
        cageName,
        this.appUuid,
        this.hostname
      );
      this.attestationDocCache[cageName] = response.attestation_doc;
    } catch (e) {
      console.warn(`Couldn't load attestation doc for ${cageName} ${e}`);
    }
  };

  get = (cageName) => {
    const doc = this.attestationDocCache[cageName];
    if (!doc) {
      console.warn(`No attestation doc found for ${cageName}`);
    }
    return doc;
  };

  init = async () => {
    let pollingInterval = this.config.http.attestationDocPollInterval;

    await this._getAttestationDocs();

    if (!this.polling) {
      this.polling = RepeatedTimer(pollingInterval, this._getAttestationDocs);
    }

    return this.polling;
  };

  clearCache = () => {
    this.attestationDocCache = null;
  };

  _getAttestationDocs = async () => {
    await Promise.all(
      this.cages.map(async (cageName) => {
        await this.loadAttestationDoc(cageName, this.appUuid);
      })
    );
  };
}

module.exports = AttestationDoc;
