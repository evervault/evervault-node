const { version } = require('../package.json');

const DEFAULT_API_URL = 'https://api.evervault.com';
const DEFAULT_CAGE_RUN_URL = 'https://run.evervault.com';
const DEFAULT_TUNNEL_HOSTNAME = 'https://relay.evervault.com:443';
const DEFAULT_CA_HOSTNAME = 'https://ca.evervault.com';

module.exports = (apikey) => ({
  http: {
    baseUrl: process.env.EV_API_URL || DEFAULT_API_URL,
    cageRunUrl: process.env.EV_CAGE_RUN_URL || DEFAULT_CAGE_RUN_URL,
    headers: {
      'API-KEY': apikey,
      'user-agent': `evervault-node/${version}`
    },
    responseType: 'json',
    tunnelHostname: process.env.EV_TUNNEL_HOSTNAME || DEFAULT_TUNNEL_HOSTNAME,
    certHostname: process.env.EV_CERT_HOSTNAME || DEFAULT_CA_HOSTNAME
  },
  encryption: {
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
  },
});
