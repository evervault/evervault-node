const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const axios = require('axios');
const { errors } = require('../lib/utils');
const rewire = require('rewire');
const { createProxyServer, createServer } = require('./utilities/mockServer');
const testApiKey =
  'ev:key:1:3bOqOkKrVFrk2Ps9yM1tHEi90CvZCjsGIihoyZncM9SdLoXQxknPPjwxiMLyDVYyX:cRhR9o:tCZFZV';
const testAppId = 'app_8022cc5a3073';
const testKey = 'legacy-key';
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';

describe('evervault client', () => {
  context('initializing the SDK', () => {
    it('should throw and error if app uuid is misconfigured', async () => {
      const Evervault = require('../lib');
      const test = () => new Evervault('', testApiKey);
      expect(test).to.throw(errors.EvervaultError);
    });

    it('should validate the api key', () => {
      const Evervault = require('../lib');
      const test = () => new Evervault(testAppId, '');
      expect(test).to.throw(errors.EvervaultError);
    });
  });

  context('encrypting data', () => {
    let server;
    let Evervault;
    const testData = { test: 'Hello World' };

    before(() => {
      const handlers = [
        {
          url: '/keys',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            key: testKey,
            ecdhKey: testEcdhCageKey,
          }),
        },
      ];
      server = createServer(handlers);
      // rewiring is needed to set the config environment variables
      // there isn't a clean way to do this at runtime because of Node.js
      // module caching system.
      EvervaultClient = rewire('../lib');
      const config = require('../lib/config');
      config.http.baseUrl = `http://localhost:${server.address().port}`;
      EvervaultClient.__set__('config', config);
      Evervault = EvervaultClient;
    });

    after(() => {
      server.close();
    });

    it('should not encrypt data with invalid data role', async () => {
      const Evervault = require('../lib');
      sdk = new Evervault(testAppId, testApiKey);

      const test = async () => sdk.encrypt(testData, '00000000000000000000000');

      try {
        await test();
        expect.fail('Expected an error to be thrown');
      } catch (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal(
          'The provided Data Role slug is invalid. The slug can be retrieved in the Evervault dashboard (Data Roles section).'
        );
      }
    });

    it('should encrypt data', async () => {
      const sdk = new Evervault(testAppId, testApiKey);

      const res = await sdk.encrypt(testData);

      expect(res.test.substring(0, 7)).to.equal('ev:RFVC');
    });

    it('should encrypt data without and api key', async () => {
      const sdk = new Evervault(testAppId, null, { encryptionClient: true });

      const res = await sdk.encrypt(testData);

      expect(res.test.substring(0, 7)).to.equal('ev:RFVC');
    });
  });

  context('decrypting data', () => {
    let server;
    let Evervault;

    before(() => {
      const handlers = [
        {
          url: '/cages/key',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            key: testKey,
            ecdhKey: testEcdhCageKey,
          }),
        },
        {
          url: '/decrypt',
          method: 'POST',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            data: 'Hello World',
          }),
        },
      ];
      server = createServer(handlers);
      // rewiring is needed to set the config environment variables
      // there isn't a clean way to do this at runtime because of Node.js
      // module caching system.
      EvervaultClient = rewire('../lib');
      const config = require('../lib/config');
      config.http.baseUrl = `http://localhost:${server.address().port}`;
      EvervaultClient.__set__('config', config);
      Evervault = EvervaultClient;
    });

    after(() => {
      server.close();
    });

    it('should decrypt data', async () => {
      const sdk = new Evervault(testAppId, testApiKey);
      const plaintext = 'Hello World';
      const ciphertext = await sdk.encrypt(plaintext);

      const plaintextResponse = await sdk.decrypt(ciphertext);

      expect(plaintextResponse).to.equal(plaintext);
    });
  });

  context('running a function', () => {
    let server;
    let Evervault;
    const functionName = 'test-function';

    before(() => {
      let handlers = [
        {
          url: '/cages/key',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            key: testKey,
            ecdhKey: testEcdhCageKey,
          }),
        },
        {
          url: `/functions/${functionName}/runs`,
          method: 'POST',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            id: 'func_run_b470a269a369',
            result: { test: 'data' },
            status: 'success',
          }),
        },
      ];
      server = createServer(handlers);
      // rewiring is needed to set the config environment variables
      // there isn't a clean way to do this at runtime because of Node.js
      // module caching system.
      EvervaultClient = rewire('../lib');
      const config = require('../lib/config');
      config.http.baseUrl = `http://localhost:${server.address().port}`;
      EvervaultClient.__set__('config', config);
      Evervault = EvervaultClient;
    });

    after(() => {
      server.close();
    });

    it('should run a function', async () => {
      const sdk = new Evervault(testAppId, testApiKey);
      const plaintext = { test: 'Hello World' };
      const ciphertext = await sdk.encrypt(plaintext);

      const functionResponse = await sdk.run(functionName, ciphertext);

      expect(functionResponse.id).to.not.be.undefined;
      expect(functionResponse.result).to.not.be.undefined;
      expect(functionResponse.status).to.equal('success');
    });
  });

  context('run token', () => {
    let server;
    let Evervault;
    const functionName = 'test-function';

    before(() => {
      let handlers = [
        {
          url: '/cages/key',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            key: testKey,
            ecdhKey: testEcdhCageKey,
          }),
        },
        {
          url: `/v2/functions/${functionName}/run-token`,
          method: 'POST',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            token: 'token',
          }),
        },
      ];
      server = createServer(handlers);
      // rewiring is needed to set the config environment variables
      // there isn't a clean way to do this at runtime because of Node.js
      // module caching system.
      EvervaultClient = rewire('../lib');
      const config = require('../lib/config');
      config.http.baseUrl = `http://localhost:${server.address().port}`;
      EvervaultClient.__set__('config', config);
      Evervault = EvervaultClient;
    });

    after(() => {
      server.close();
    });

    it('should create a run token', async () => {
      const sdk = new Evervault(testAppId, testApiKey);
      let runPayload = {
        data: { test: 'Hello World' },
      };
      const functionResponse = await sdk.createRunToken(
        functionName,
        runPayload
      );

      expect(functionResponse.token).to.equal('token');
    });
  });

  context('proxies a request', () => {
    let apiServer;
    let targetServer;
    let proxyServer;
    let Evervault;

    before(() => {
      const targetHandlers = [
        {
          url: '/',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({ success: true }),
        },
      ];

      targetServer = createServer(targetHandlers);

      const apiHandlers = [
        {
          url: '/v2/relay-outbound',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: {
            'Content-Type': 'application/json',
            'x-poll-interval': 1,
          },
          responseBody: JSON.stringify({
            appUuid: 'app_5b849d3d269d',
            teamUuid: '2ef8d35ce668',
            strictMode: true,
            outboundDestinations: {
              [`localhost:${targetServer.address().port}`]: {
                id: 153,
                appUuid: 'app_5b849d3d269d',
                createdAt: '2022-10-07T10:14:18.597Z',
                updatedAt: '2022-10-07T10:14:18.597Z',
                deletedAt: null,
                routeSpecificFieldsToEncrypt: [],
                deterministicFieldsToEncrypt: [],
                encryptEmptyStrings: true,
                curve: 'secp256k1',
                uuid: 'outbound_destination_f0d7b61c8d52',
                destinationDomain: `localhost:${targetServer.address().port}`,
              },
            },
          }),
        },
      ];

      apiServer = createServer(apiHandlers);

      proxyServer = createProxyServer();
      // rewiring is needed to set the config environment variables
      // there isn't a clean way to do this at runtime because of Node.js
      // module caching system.
      EvervaultClient = rewire('../lib');
      const config = require('../lib/config');
      config.http.baseUrl = `http://localhost:${apiServer.address().port}`;
      config.http.tunnelHostname = `http://localhost:${
        proxyServer.address().port
      }`;
      EvervaultClient.__set__('config', config);
      Evervault = EvervaultClient;
    });

    after(() => {
      apiServer.close();
      targetServer.close();
      proxyServer.close();
    });

    it('should proxy a request to the target server', async () => {
      const sdk = new Evervault(testAppId, testApiKey);
      await sdk.enableOutboundRelay();

      const response = await axios.get(
        `http://localhost:${targetServer.address().port}`
      );

      const responseJson = response.data;
      expect(responseJson.success).to.be.true;
    });
  });
});
