const { expect } = require('chai');
const Evervault = require('../lib');
const {
  http: { proxiedMarker },
} = require('../lib/config');
const axios = require('axios');
const { v4 } = require('uuid');

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
      const response = await axios.post(
        `${syntheticEndpointUrl}?syntheticUuid=${v4()}&mode=outbound`,
        encrypted
      );
      const body = response.data;
      expect(body.request.string).to.equal(false);
      expect(body.request.number).to.equal(false);
      expect(body.request.boolean).to.equal(false);
      expect(response.request[proxiedMarker]).to.equal(true);
    });
  });

  context('Enable Outbound Relay with decryption domains', () => {
    it('Proxies the listed domains correctly, ignoring others', async () => {
      const payload = {
        string: 'some_string',
        number: 1234567890,
        boolean: true,
      };
      const encrypted = await evervaultClient.encrypt(payload);

      await evervaultClient.enableOutboundRelay({
        decryptionDomains: ['httpbin.org'],
      });

      const [httpbinRes, syntheticRes] = await Promise.allSettled([
        axios.post('https://httpbin.org/post', encrypted),
        axios.get(syntheticEndpointUrl),
      ]);

      expect(httpbinRes.value.request[proxiedMarker]).to.equal(true);
      expect(syntheticRes.value.request[proxiedMarker]).to.equal(false);
    });
  });

  context(
    'Enable Outbound Relay with decryption domains including paths',
    () => {
      it('Filters requests by path', async () => {
        const payload = {
          string: 'some_string',
          number: 1234567890,
          boolean: true,
        };
        const encrypted = await evervaultClient.encrypt(payload);

        await evervaultClient.enableOutboundRelay({
          decryptionDomains: ['httpbin.org/post'],
        });

        const [postRes, getRes] = await Promise.allSettled([
          axios.post('https://httpbin.org/post', encrypted),
          axios.get('https://httpbin.org/get'),
        ]);

        expect(postRes.value.request[proxiedMarker]).to.equal(true);
        expect(getRes.value.request[proxiedMarker]).to.equal(false);
      });
    }
  );

  context(
    'Enable Outbound Relay with decryption domains including paths with wildcards',
    () => {
      it('Filters requests by path, respecting wildcards', async () => {
        const payload = {
          string: 'some_string',
          number: 1234567890,
          boolean: true,
        };
        const encrypted = await evervaultClient.encrypt(payload);

        await evervaultClient.enableOutboundRelay({
          decryptionDomains: ['httpbin.org/post/*'],
        });

        const [matchingPostRes, failingPostRes] = await Promise.allSettled([
          axios.post('https://httpbin.org/post/somewhere', encrypted),
          axios.get('https://httpbin.org/post'),
        ]);

        expect(matchingPostRes.value.request[proxiedMarker]).to.equal(true);
        expect(failingPostRes.value.request[proxiedMarker]).to.equal(false);
      });
    }
  );
});
