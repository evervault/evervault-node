const axios = require('axios');
const Evervault = require('./lib');
const evervault = new Evervault(
  'app_16688a4022b0',
  'ev:key:1:4MaKtEOgj0WVYzrGkwvUHCfkw5hozD3mdvA3dFFXVqkWMajijNa7nphCreNYXyy2O:u+IM6J:rtXyfU'
);

(async () => {
  const httpsAgent = evervault.createRelayHttpsAgent();
  const response = await axios.get('https://enx4th0aktbs.x.pipedream.net', {
    httpsAgent,
  });
})();
