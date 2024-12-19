const RepeatedTimer = require('./repeatedTimer');

/**
 * @typedef {Object} Config
 * @property {{attestationDocPollInterval: number}} http
 */

/**
 * @typedef {Object} HttpClient
 * @property {(name: string, appUuid: string, hostname: string) => Promise<{attestation_doc: any}>} getAttestationDoc
 */

/**
 * @typedef {{[key: string]: any}} AttestationDocCache
 */

class AttestationDoc {
  /** @type {string} */
  appUuid;
  /** @type {HttpClient} */
  http;
  /** @type {string[]} */
  enclaves;
  /** @type {Config} */
  config;
  /** @type {any} */
  polling;
  /** @type {AttestationDocCache} */
  attestationDocCache;
  /** @type {string} */
  hostname;

  /**
   * @param {Config} config
   * @param {HttpClient} http
   * @param {string[]} enclaves
   * @param {string} appUuid
   * @param {string} hostname
   */
  constructor(config, http, enclaves, appUuid, hostname) {
    this.appUuid = appUuid.replace(/_/g, '-');
    this.http = http;
    this.enclaves = enclaves;
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

  /**
   * @param {string} name
   */
  loadAttestationDoc = async (name) => {
    try {
      const response = await this.http.getAttestationDoc(
        name,
        this.appUuid,
        this.hostname
      );
      this.attestationDocCache[name] = response.attestation_doc;
    } catch (e) {
      console.warn(`Couldn't load attestation doc for ${name} ${e}`);
    }
  };

  /**
   * @param {string} name
   * @returns {any}
   */
  get = (name) => {
    const doc = this.attestationDocCache[name];
    if (!doc) {
      console.warn(`No attestation doc found for ${name}`);
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
    this.attestationDocCache = {};
  };

  _getAttestationDocs = async () => {
    await Promise.all(
      this.enclaves.map(async (name) => {
        await this.loadAttestationDoc(name);
      })
    );
  };
}

module.exports = AttestationDoc;
