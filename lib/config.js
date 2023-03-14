const { version } = require('../package.json');

const DEFAULT_API_URL = 'https://api.evervault.com';
const DEFAULT_FUNCTION_RUN_URL = 'https://run.evervault.com';
const DEFAULT_TUNNEL_HOSTNAME = 'https://relay.evervault.com:443';
const DEFAULT_CA_HOSTNAME = 'https://ca.evervault.com';
const DEFAULT_CAGES_CA_HOSTNAME = 'https://cages-ca.evervault.com';
const DEFAULT_CAGES_HOSTNAME = 'cages.evervault.com';
const DEFAULT_POLL_INTERVAL = 5;
const DEFAULT_MAX_FILE_SIZE_IN_MB = 25;

module.exports = (apikey) => ({
  http: {
    baseUrl: process.env.EV_API_URL || DEFAULT_API_URL,
    functionRunUrl: process.env.EV_CAGE_RUN_URL || DEFAULT_FUNCTION_RUN_URL,
    headers: {
      'API-KEY': apikey,
      'user-agent': `evervault-node/${version}`,
    },
    responseType: 'json',
    tunnelHostname: process.env.EV_TUNNEL_HOSTNAME || DEFAULT_TUNNEL_HOSTNAME,
    certHostname: process.env.EV_CERT_HOSTNAME || DEFAULT_CA_HOSTNAME,
    cagesCertHostname:
      process.env.EV_CAGE_CERT_HOSTNAME || DEFAULT_CAGES_CA_HOSTNAME,
    cagesHostname: process.env.EV_CAGES_HOSTNAME || DEFAULT_CAGES_HOSTNAME,
    pollInterval: process.env.EV_POLL_INTERVAL || DEFAULT_POLL_INTERVAL,
  },
  encryption: {
    secp256k1: {
      ecdhCurve: 'secp256k1',
      keyCycleMinutes: 0.25,
      cipherAlgorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 12,
      authTagLength: 16,
      evVersion: 'DUB',
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
      evVersion: 'NOC',
      header: {
        iss: 'evervault',
        version: 2,
      },
      maxFileSizeInMB:
        process.env.EV_MAX_FILE_SIZE_IN_MB || DEFAULT_MAX_FILE_SIZE_IN_MB,
    },
  },
});
