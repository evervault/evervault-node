const RepeatedTimer = require('./repeatedTimer');

const staticPcrsToProvider = (pcrs) => {
  const provider = async () => {
    return new Promise((resolve) => {
      resolve(pcrs);
    });
  };

  return { pcrs, provider };
};

const loadPcrStore = (attestationData) => {
  const providers = {};
  for (const [enclaveName, value] of Object.entries(attestationData)) {
    if (Array.isArray(value)) {
      providers[enclaveName] = staticPcrsToProvider(value);
    } else if (typeof value === 'object') {
      providers[enclaveName] = staticPcrsToProvider([value]);
    } else if (typeof value === 'function') {
      providers[enclaveName] = { pcrs: [], provider: value };
    } else {
      console.warn(`Invalid attestation data for ${enclaveName}.`);
    }
  }

  return providers;
};

class PcrManager {
  constructor(config, attestationData) {
    this.store = loadPcrStore(attestationData);
    this.config = config;
    this.polling = null;
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

  fetchPcrs = async (enclaveName) => {
    const enclave = this.store[enclaveName];

    if (!enclave || !enclave.provider) {
      console.warn(
        `PCR provider for ${enclaveName} is not registered. Cannot fetch PCRs.`
      );
      return;
    }

    let retries = 3;
    let delay = 500;

    //Retry twice
    for (let i = 0; i <= retries; i++) {
      try {
        const newPcrs = await enclave.provider();

        if (!newPcrs) {
          console.warn(
            `PCR provider for ${enclaveName} did not return PCRs. Cannot fetch PCRs. Using old PCRs`
          );
        } else {
          enclave.pcrs = newPcrs;
        }

        this.store[enclaveName] = enclave;
        break;
      } catch (error) {
        if (i < retries) {
          console.warn(
            `Couldn't fetch PCRs for ${enclaveName}. Retrying in ${delay} ms. Error: ${error}`
          );
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        } else {
          console.warn(
            `Couldn't fetch PCRs after ${retries} retries for ${enclaveName}. Error: ${error}`
          );
        }
      }
    }
  };

  get = (enclaveName) => {
    const storedAttestationData = this.store[enclaveName];
    const pcrs = storedAttestationData ? storedAttestationData.pcrs : undefined;

    if (!pcrs) {
      // Trigger fetching PCRs in the background
      // checkServerIdentity is sync so can't run an async function, so we have to do this
      // to make best effort to have the PCRs next time if they weren't available.
      this.fetchPcrs(enclaveName);
    }

    return pcrs;
  };

  init = async () => {
    let pollingInterval = this.config.http.pcrProviderPollInterval;

    await this._getPcrs();

    if (!this.polling) {
      this.polling = RepeatedTimer(pollingInterval, this._getPcrs);
    }

    return this.polling;
  };

  clearStoredPcrs = () => {
    for (const [enclaveName, value] of Object.entries(this.store)) {
      this.store[enclaveName] = { pcrs: null, provider: value.provider };
    }
  };

  clearStore = () => {
    this.store = {};
  };

  _getPcrs = async () => {
    await Promise.all(
      Object.keys(this.store).map(
        async (enclaveName) => await this.fetchPcrs(enclaveName)
      )
    );
  };
}

module.exports = PcrManager;
