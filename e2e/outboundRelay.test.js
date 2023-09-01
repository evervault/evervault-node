const { expect } = require('chai');
const Evervault = require('../lib');
const axios = require('axios');

describe('Outbound Relay Test', () => {
  const appUuid = process.env.EV_APP_UUID;
  const apiKey = process.env.EV_API_KEY;
  const syntheticEndpointUrl = process.env.EV_SYNTHETIC_ENDPOINT_URL;

  let evervaultClient;

  beforeEach(() => {
    evervaultClient = new Evervault(appUuid, apiKey);
  });

  context('Enable Outbound Relay', () => {
    it('proxies the request and decrypts the data', async () => {
      const payload = {
        string: 'some_string',
        number: 1234567890,
        boolean: true,
      };
      const encrypted = await evervaultClient.encrypt(payload);

      await evervaultClient.enableOutboundRelay();
      const response = await axios.post(syntheticEndpointUrl, encrypted);
      const body = response.data;
      expect(body.request.string).to.equal(false);
      expect(body.request.number).to.equal(false);
      expect(body.request.boolean).to.equal(false);
    });
  });
});
