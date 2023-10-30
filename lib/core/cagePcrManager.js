const RepeatedTimer = require('./repeatedTimer');

staticPcrsToProvider = (pcrs) => {
  const provider = async () => {
    return new Promise((resolve) => {
      resolve(pcrs);
    });
  };

  return { pcrs, provider };
};

loadPcrStore = (cageAttestationData) => {
  var providers = {};
  for (const [cageName, value] of Object.entries(cageAttestationData)) {
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

class CagePcrManager {
  constructor(config, cagesAttestationData) {
    this.store = loadPcrStore(cagesAttestationData);
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

  fetchPcrs = async (cageName) => {
    const cage = this.store[cageName];

    if (!cage?.provider) {
      console.warn(
        `PCR provider for ${cageName} is not registered. Cannot fetch PCRs.`
      );
      return;
    }

    let retries = 3;
    let delay = 500;

    //Retry twice
    for (let i = 0; i <= retries; i++) {
      try {
        const newPcrs = await cage.provider();

        if (!newPcrs) {
          console.warn(
            `PCR provider for ${cageName} did not return PCRs. Cannot fetch PCRs. Using old PCRs`
          );
        } else {
          cage.pcrs = newPcrs;
        }

        this.store[cageName] = cage;
        break;
      } catch (error) {
        if (i < retries) {
          console.warn(
            `Couldn't fetch PCRs for ${cageName}. Retrying in ${delay} ms. Error: ${error}`
          );
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        } else {
          console.warn(
            `Couldn't fetch PCRs after ${retries} retries for ${cageName}. Error: ${error}`
          );
        }
      }
    }
  };

  get = (cageName) => {
    const storedCageData = this.store[cageName];
    const pcrs = storedCageData?.pcrs;

    if (!pcrs) {
      // Trigger fetching PCRs in the background
      // checkServerIdentity is sync so can't run an async function, so we have to do this
      // to make best effort to have the PCRs next time if they weren't available.
      this.fetchPcrs(cageName);
    }

    return pcrs;
  };

  init = async () => {
    let pollingInterval = this.config.http.pcrProviderPollInterval;

    await this._getPcrs();

    if (!this.polling) {
      this.polling = RepeatedTimer(pollingInterval, this._getPcrs);
    }
  };

  clearStoredPcrs = () => {
    for (const [cageName, value] of Object.entries(this.store)) {
      this.store[cageName] = { pcrs: null, provider: value.provider };
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

module.exports = CagePcrManager;
