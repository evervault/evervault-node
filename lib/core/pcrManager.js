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
  for (const [cageName, value] of Object.entries(attestationData)) {
    if (Array.isArray(value)) {
      providers[cageName] = staticPcrsToProvider(value);
    } else if (typeof value === 'object') {
      providers[cageName] = staticPcrsToProvider([value]);
    } else if (typeof value === 'function') {
      providers[cageName] = { pcrs: [], provider: value };
    } else {
      console.warn(`Invalid attestation data for ${cageName}.`);
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

  fetchPcrs = async (name) => {
    const enclave = this.store[name];

    if (!enclave || !enclave.provider) {
      console.warn(
        `PCR provider for ${name} is not registered. Cannot fetch PCRs.`
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
            `PCR provider for ${name} did not return PCRs. Cannot fetch PCRs. Using old PCRs`
          );
        } else {
          enclave.pcrs = newPcrs;
        }

        this.store[name] = enclave;
        break;
      } catch (error) {
        if (i < retries) {
          console.warn(
            `Couldn't fetch PCRs for ${name}. Retrying in ${delay} ms. Error: ${error}`
          );
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        } else {
          console.warn(
            `Couldn't fetch PCRs after ${retries} retries for ${name}. Error: ${error}`
          );
        }
      }
    }
  };

  get = (name) => {
    const storedCageData = this.store[name];
    const pcrs = storedCageData ? storedCageData.pcrs : undefined;

    if (!pcrs) {
      // Trigger fetching PCRs in the background
      // checkServerIdentity is sync so can't run an async function, so we have to do this
      // to make best effort to have the PCRs next time if they weren't available.
      this.fetchPcrs(name);
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
    for (const [name, value] of Object.entries(this.store)) {
      this.store[name] = { pcrs: null, provider: value.provider };
    }
  };

  clearStore = () => {
    this.store = {};
  };

  _getPcrs = async () => {
    await Promise.all(
      Object.keys(this.store).map(
        async (cageName) => await this.fetchPcrs(cageName)
      )
    );
  };
}

module.exports = PcrManager;
