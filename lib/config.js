const { version } = require('../package.json');

const DEFAULT_API_URL = 'https://api.evervault.com';
const DEFAULT_TUNNEL_HOSTNAME = 'https://relay.evervault.com:443';
const DEFAULT_CA_HOSTNAME = 'https://ca.evervault.com';
const DEFAULT_ENCLAVES_HOSTNAME = 'enclave.evervault.com';
const DEFAULT_POLL_INTERVAL = 5;
const DEFAULT_MAX_FILE_SIZE_IN_MB = 25;
const DEFAULT_ATTEST_POLL_INTERVAL = 120;
const DEFAULT_PCR_PROVIDER_POLL_INTERVAL = 60;

/** @type {import('./types').MasterConfig} */
module.exports = {
  http: {
    baseUrl: process.env.EV_API_URL || DEFAULT_API_URL,
    userAgent: `evervault-node/${version}`,
    tunnelHostname: process.env.EV_TUNNEL_HOSTNAME || DEFAULT_TUNNEL_HOSTNAME,
    certHostname: process.env.EV_CERT_HOSTNAME || DEFAULT_CA_HOSTNAME,
    enclavesHostname:
      process.env.EV_ENCLAVES_HOSTNAME || DEFAULT_ENCLAVES_HOSTNAME,
    pollInterval: process.env.EV_POLL_INTERVAL || DEFAULT_POLL_INTERVAL,
    attestationDocPollInterval:
      process.env.EV_ATTEST_POLL_INTERVAL || DEFAULT_ATTEST_POLL_INTERVAL,
    pcrProviderPollInterval:
      process.env.EV_PCR_PROVIDER_POLL_INTERVAL ||
      DEFAULT_PCR_PROVIDER_POLL_INTERVAL,
    proxiedMarker: Symbol.for('request-proxied'),
  },
  encryption: {
    secp256k1: {
      ecdhCurve: 'secp256k1',
      keyCycleMinutes: 0.25,
      cipherAlgorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 12,
      authTagLength: 16,
      evVersion: 'RFVC',
      evVersionWithMetadata: 'S0lS',
      header: {
        iss: 'evervault',
        version: 1,
      },
      maxFileSizeInMB:
        process.env.EV_MAX_FILE_SIZE_IN_MB || DEFAULT_MAX_FILE_SIZE_IN_MB,
    },
    prime256v1: {
      ecdhCurve: 'prime256v1',
      keyCycleMinutes: 0.25,
      cipherAlgorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 12,
      authTagLength: 16,
      evVersion: 'Tk9D',
      evVersionWithMetadata: 'QkTC',
      header: {
        iss: 'evervault',
        version: 2,
      },
      maxFileSizeInMB:
        process.env.EV_MAX_FILE_SIZE_IN_MB || DEFAULT_MAX_FILE_SIZE_IN_MB,
    },
  },
};
