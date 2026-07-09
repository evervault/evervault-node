import RepeatedTimer from './repeatedTimer';
import type { MasterConfig } from '../types';

class AttestationDoc {
  appUuid: string;
  http: any;
  enclaves: string[];
  config: MasterConfig;
  polling: ReturnType<typeof RepeatedTimer> | null;
  attestationDocCache: Record<string, any> | null;
  hostname: string;

  constructor(
    config: MasterConfig,
    http: any,
    enclaves: string[],
    appUuid: string,
    hostname: string
  ) {
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

  loadAttestationDoc = async (name: string) => {
    try {
      const response = await this.http.getAttestationDoc(
        name,
        this.appUuid,
        this.hostname
      );
      this.attestationDocCache![name] = response.attestation_doc;
    } catch (e) {
      console.warn(`Couldn't load attestation doc for ${name} ${e}`);
    }
  };

  get = (name: string) => {
    const doc = this.attestationDocCache![name];
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
    this.attestationDocCache = null;
  };

  _getAttestationDocs = async () => {
    await Promise.all(
      this.enclaves.map(async (name) => {
        await this.loadAttestationDoc(name);
      })
    );
  };
}

export default AttestationDoc;
