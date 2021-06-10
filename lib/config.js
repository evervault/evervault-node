const { version } = require("../package.json");
const API_URL = "https://api.evervault.com";
const CAGE_RUN_URL = "https://cage.run";

module.exports = (apikey) => ({
  http: {
    baseUrl: API_URL,
    cageRunUrl: CAGE_RUN_URL,
    headers: {
      "API-KEY": apikey,
      "user-agent": `evervault-node/${version}`,
    },
    responseType: "json",
    tunnelHostname: "https://relay.evervault.com:443",
  },
  encryption: {
    ecdhCurve: "secp256k1",
    keyCycleMinutes: 0.25,
    cipherAlgorithm: "aes-256-gcm",
    keyLength: 32,
    ivLength: 12,
    authTagLength: 16,
    header: {
      iss: "evervault",
      version: 1,
    },
  },
});
