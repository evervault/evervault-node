const { version } = require('../package.json');

module.exports = (apikey) => ({
  http: {
    baseUrl: process.env.EV_API_URL || 'https://api.evervault.com',
    cageRunUrl: process.env.EV_CAGE_RUN_URL || 'https://run.evervault.com',
    headers: {
      'API-KEY': apikey,
      'user-agent': `evervault-node/${version}`
    },
    responseType: 'json',
    tunnelHostname: process.env.EV_TUNNEL_HOSTNAME || 'https://relay.evervault.com:443',
    certHostname: process.env.EV_CERT_HOSTNAME || 'https://ca.evervault.com'
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
