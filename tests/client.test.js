const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const sinon = require('sinon');
const phin = require('phin');
const https = require('https');
const { RelayOutboundConfig } = require('../lib/core');
const { errors } = require('../lib/utils');
const fixtures = require('./utilities/fixtures');
const rewire = require('rewire');
const http = require('http');
const {
  createServer,
  createProxyServer,
  createServerTwo,
} = require('./utilities/mockServer');
const functionName = 'test-function',
  testData = { test: 'Hello World' };
const testApiKey =
  'ev:key:1:3bOqOkKrVFrk2Ps9yM1tHEi90CvZCjsGIihoyZncM9SdLoXQxknPPjwxiMLyDVYyX:cRhR9o:tCZFZV';
const testAppId = 'app_8022cc5a3073';
const testCageKey = 'im-the-function-key';
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';

// const encryptStub = sinon.stub();
describe('evervault client', () => {
  // beforeEach(() => {
  //   // EvervaultClient = rewire('../lib');
  //   // EvervaultClient.__set__({
  //     // Crypto: () => ({
  //       // encrypt: encryptStub,
  //     }),
  //   });
  // });

  // afterEach(() => {
  //   encryptStub.reset();
  // });

  // context('Initialising the sdk', () => {
  //   const prepareSdkImport =
  //     (...args) =>
  //     () => {
  //       return new EvervaultClient(...args);
  //     };

  //   context('No api key provided', () => {
  //     it('throws an error', () => {
  //       expect(prepareSdkImport()).to.throw(errors.EvervaultError);
  //     });
  //   });

  //   context('An object is provided instead of an api key', () => {
  //     it('throws an error', () => {
  //       expect(prepareSdkImport({})).to.throw(errors.EvervaultError);
  //     });
  //   });

  //   context('An invalid App ID is provided', () => {
  //     it('throws an error', () => {
  //       expect(prepareSdkImport('ev:key:')).to.throw(errors.EvervaultError);
  //     });
  //   });

  //   context('No api key provided', () => {
  //     it('throws an error', () => {
  //       expect(prepareSdkImport('app_id')).to.throw(errors.EvervaultError);
  //     });
  //   });

  //   context('An API key is provided but does not belong to the app', () => {
  //     it('throws an error', () => {
  //       expect(prepareSdkImport('app_098765432121', testApiKey)).to.throw(
  //         errors.EvervaultError
  //       );
  //     });
  //   });

  //   context('An api key and an app id is provided', () => {
  //     it('returns an sdk object', () => {
  //       const sdk = new EvervaultClient(testAppId, testApiKey);
  //       expect(sdk.encrypt).to.be.a('function');
  //       expect(sdk.run).to.be.a('function');
  //     });
  //   });

  //   context('Invoking returned encrypt', () => {
  //     let sdk;
  //     beforeEach(() => {
  //       sdk = new EvervaultClient(testAppId, testApiKey);
  //     });

  //     afterEach(() => {
  //       encryptStub.reset();
  //     });

  //     context('getCageKey fails', () => {
  //       let cageKeyNock;
  //       beforeEach(() => {
  //         cageKeyNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: {
  //             'API-KEY': testApiKey,
  //           },
  //         })
  //           .get('/cages/key')
  //           .reply(401, { errorMesage: 'error retrieving cage key' });
  //       });

  //       it('Throws an error', () => {
  //         return sdk.encrypt(testData).catch((err) => {
  //           expect(cageKeyNock.isDone()).to.be.true;
  //           expect(err).to.be.instanceOf(errors.EvervaultError);
  //           expect(encryptStub).to.not.have.been.called;
  //         });
  //       });
  //     });

  //     context('getCageKey succeeds', () => {
  //       let cageKeyNock;
  //       beforeEach(() => {
  //         cageKeyNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: {
  //             'API-KEY': testApiKey,
  //           },
  //         })
  //           .get('/cages/key')
  //           .reply(200, { key: testCageKey, ecdhKey: testEcdhCageKey });
  //         encryptStub.resolves({
  //           data: 'yes',
  //         });
  //       });
  //     });

  //     context('multiple encrypt calls', () => {
  //       const httpStub = sinon.stub();
  //       const getCageKeyStub = sinon.stub();
  //       let sdk;
  //       before(() => {
  //         getCageKeyStub.resolves({ key: testCageKey });
  //         httpStub.returns({ getCageKey: getCageKeyStub });
  //         encryptStub.resolves({
  //           data: 'yes',
  //         });
  //         EvervaultClient.__set__({
  //           Http: httpStub,
  //         });
  //         sdk = new EvervaultClient(testAppId, testApiKey);
  //       });
  //     });
  //   });

  //   // context('Invoking encrypt client', () => {
  //     // let sdk;
  //     // beforeEach(() => {
  //     //   sdk = new EvervaultClient(testAppId, testApiKey, {
  //     //     encryptionClient: true,
  //     //   });
  //     // });

  //     // afterEach(() => {
  //     //   encryptStub.reset();
  //     // });

  //     // context('getAppKey fails', () => {
  //     //   let appKeyNock;
  //     //   beforeEach(() => {
  //     //     appKeyNock = nock(sdk.config.http.baseUrl, {
  //     //       reqheaders: {
  //     //         'API-KEY': testApiKey,
  //     //       },
  //     //     })
  //     //       .get('/apps/key')
  //     //       .reply(401, { errorMesage: 'error retrieving app key' });
  //     //   });

  //     //   it('Throws an error', () => {
  //     //     return sdk.encrypt(testData).catch((err) => {
  //     //       expect(appKeyNock.isDone()).to.be.true;
  //     //       expect(err).to.be.instanceOf(errors.EvervaultError);
  //     //       expect(encryptStub).to.not.have.been.called;
  //     //     });
  //     //   });
  //     // });

  //     // context('getAppKey succeeds', () => {
  //     //   let appKeyNock;
  //     //   beforeEach(() => {
  //     //     appKeyNock = nock(sdk.config.http.baseUrl)
  //     //       .get('/apps/key')
  //     //       .reply(200, { key: testCageKey, ecdhKey: testEcdhCageKey })
  //     //       .log(console.log);
  //     //   });

  //     //   it('It receives the expected response', () => {
  //     //     return sdk.encrypt(testData).then((result) => {
  //     //       expect(result).to.deep.equal({ data: 'yes' });
  //     //       expect(appKeyNock.isDone()).to.be.true;
  //     //     });
  //     //   });

  //     // });

  //     // context('getCageKey succeeds', () => {
  //     //   let cageKeyNock;
  //     //   beforeEach(() => {
  //     //     cageKeyNock = nock(sdk.config.http.baseUrl, {
  //     //       reqheaders: {
  //     //         'API-KEY': testApiKey,
  //     //       },
  //     //     })
  //     //       .get('/cages/key')
  //     //       .reply(200, { key: testCageKey, ecdhKey: testEcdhCageKey });
  //     //     encryptStub.resolves({
  //     //       data: 'yes',
  //     //     });
  //     //   });
  //     // });

  //     // context('multiple encrypt calls', () => {
  //     //   const httpStub = sinon.stub();
  //     //   const getCageKeyStub = sinon.stub();
  //     //   let sdk;
  //     //   before(() => {
  //     //     getCageKeyStub.resolves({ key: testCageKey });
  //     //     httpStub.returns({ getCageKey: getCageKeyStub });
  //     //     encryptStub.resolves({
  //     //       data: 'yes',
  //     //     });
  //     //     EvervaultClient.__set__({
  //     //       Http: httpStub,
  //     //     });
  //     //     sdk = new EvervaultClient(testAppId, testApiKey);
  //     //   });
  //     // });
  //   // });

  //   context('Invoking function run', () => {
  //     let runNock, sdk, testResponse;

  //     beforeEach(() => {
  //       sdk = new EvervaultClient(testAppId, testApiKey);
  //     });

  //     context('Function run succeeds', () => {
  //       beforeEach(() => {
  //         testResponse = {
  //           id: 'func_run_b470a269a369',
  //           result: { test: 'data' },
  //           status: 'success',
  //         };
  //         runNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: sdk.config.http.headers,
  //         })
  //           .post(`/functions/${functionName}/runs`)
  //           .reply(200, testResponse);
  //       });

  //       it('It receives the expected response', () => {
  //         return sdk.run(functionName, testData).then((result) => {
  //           expect(result).to.deep.equal(testResponse);
  //           expect(runNock.isDone()).to.be.true;
  //         });
  //       });
  //     });

  //     context('Function run fails', () => {
  //       beforeEach(() => {
  //         testResponse = {
  //           error: { message: 'Uh oh!', stack: 'Error: Uh oh!...' },
  //           id: 'func_run_e4f1d8d83ec0',
  //           status: 'failure',
  //         };
  //         runNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: sdk.config.http.headers,
  //         })
  //           .post(`/functions/${functionName}/runs`)
  //           .reply(200, testResponse);
  //       });

  //       it('It throws an error', () => {
  //         return sdk
  //           .run(functionName, testData)
  //           .then((_) => {
  //             expect.fail('Expected an error to be thrown');
  //           })
  //           .catch((err) => {
  //             expect(runNock.isDone()).to.be.true;
  //             expect(err).to.be.instanceOf(errors.FunctionRuntimeError);
  //             expect(err.message).to.equal(testResponse.error.message);
  //           });
  //       });
  //     });

  //     context('Function initialization fails', () => {
  //       beforeEach(() => {
  //         testResponse = {
  //           error: {
  //             message: 'The function failed to initialize...',
  //             stack: 'JavaScript Error',
  //           },
  //           id: 'func_run_8c70a47efcb4',
  //           status: 'failure',
  //         };
  //         runNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: sdk.config.http.headers,
  //         })
  //           .post(`/functions/${functionName}/runs`)
  //           .reply(200, testResponse);
  //       });

  //       it('It throws an error', () => {
  //         return sdk
  //           .run(functionName, testData)
  //           .then((_) => {
  //             expect.fail('Expected an error to be thrown');
  //           })
  //           .catch((err) => {
  //             expect(runNock.isDone()).to.be.true;
  //             expect(err).to.be.instanceOf(errors.FunctionRuntimeError);
  //             expect(err.message).to.equal(testResponse.error.message);
  //           });
  //       });
  //     });

  //     context('Error thrown by API', () => {
  //       beforeEach(() => {
  //         testResponse = {
  //           status: 401,
  //           code: 'unauthorized',
  //           title: 'Unauthorized',
  //           detail:
  //             'The request cannot be authenticated. The request does not contain valid credentials. Please retry with a valid API key.',
  //         };
  //         runNock = nock(sdk.config.http.baseUrl, {
  //           reqheaders: sdk.config.http.headers,
  //         })
  //           .post(`/functions/${functionName}/runs`)
  //           .reply(401, testResponse);
  //       });

  //       it('It throws an error', () => {
  //         return sdk
  //           .run(functionName, testData)
  //           .then((_) => {
  //             expect.fail('Expected an error to be thrown');
  //           })
  //           .catch((err) => {
  //             expect(runNock.isDone()).to.be.true;
  //             expect(err).to.be.instanceOf(errors.EvervaultError);
  //             expect(err.message).to.equal(testResponse.detail);
  //           });
  //       });
  //     });
  //   });

  //   context('Testing outbound decryption', () => {
  //     const originalRequest = https.request;

  //     const wasProxied = (request, apiKey) => {
  //       return request.req.headers['proxy-authorization'] === apiKey;
  //     };

  //     afterEach(() => {
  //       https.request = originalRequest;
  //       RelayOutboundConfig.clearCache();
  //       RelayOutboundConfig.disablePolling();
  //     });

  //     it('Proxies when outbound relay is enabled', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       relayOutboundConfigNock = nock(client.config.http.baseUrl, {
  //         reqheaders: {
  //           'API-KEY': testApiKey,
  //         },
  //       })
  //         .get('/v2/relay-outbound')
  //         .reply(200, fixtures.relayOutboundResponse.data);
  //       await client.enableOutboundRelay();

  //       nockrandom = nock('https://destination1.evervault.test', {
  //         reqheaders: {
  //           'Proxy-Authorization': testApiKey,
  //         },
  //       })
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies when outbound relay is enabled and debugRequests option is present', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       relayOutboundConfigNock = nock(client.config.http.baseUrl, {
  //         reqheaders: {
  //           'API-KEY': testApiKey,
  //         },
  //       })
  //         .get('/v2/relay-outbound')
  //         .reply(200, fixtures.relayOutboundResponse.data);
  //       await client.enableOutboundRelay({ debugRequests: true });

  //       nockrandom = nock('https://destination1.evervault.test', {
  //         reqheaders: {
  //           'Proxy-Authorization': testApiKey,
  //         },
  //       })
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies when outbound relay is enabled and a wildcard domain is included in the config', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       relayOutboundConfigNock = nock(client.config.http.baseUrl, {
  //         reqheaders: {
  //           'API-KEY': testApiKey,
  //         },
  //       })
  //         .get('/v2/relay-outbound')
  //         .reply(200, fixtures.relayOutboundResponse.data);
  //       await client.enableOutboundRelay();

  //       nockrandom = nock('https://destination1.evervault.io', {
  //         reqheaders: {
  //           'Proxy-Authorization': testApiKey,
  //         },
  //       })
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.io');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies domain included in decryptionDomains (constructor)', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey, {
  //         decryptionDomains: ['destination1.evervault.test'],
  //       });

  //       nockrandom = nock('https://destination1.evervault.test', {})
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies a wildcard domain included in decryptionDomains (constructor)', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey, {
  //         decryptionDomains: ['*.evervault.test'],
  //       });

  //       nockrandom = nock('https://destination1.evervault.test', {})
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies domain included in decryptionDomains', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       await client.enableOutboundRelay({
  //         decryptionDomains: ['destination1.evervault.test'],
  //       });

  //       nockrandom = nock('https://destination1.evervault.test', {})
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies domain included in decryptionDomains and debugRequests option is present', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       await client.enableOutboundRelay({
  //         decryptionDomains: ['destination1.evervault.test'],
  //         debugRequests: true,
  //       });

  //       nockrandom = nock('https://destination1.evervault.test', {})
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Proxies a wildcard domain included in decryptionDomains', async () => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       await client.enableOutboundRelay({
  //         decryptionDomains: ['*.evervault.test'],
  //       });

  //       nockrandom = nock('https://destination1.evervault.test', {})
  //         .get('/')
  //         .reply(200, { success: true });

  //       const response = await phin('https://destination1.evervault.test');
  //       expect(wasProxied(response, testApiKey)).to.be.true;
  //     });

  //     it('Should throw an exception if outbound relay failed to be enabled', (done) => {
  //       const client = new EvervaultClient(testAppId, testApiKey);
  //       relayOutboundConfigNock = nock(client.config.http.baseUrl, {
  //         reqheaders: {
  //           'API-KEY': testApiKey,
  //         },
  //       })
  //         .get('/v2/relay-outbound')
  //         .reply(500, fixtures.relayOutboundResponse.data);
  //       client.enableOutboundRelay().catch((err) => {
  //         expect(err).to.be.an('error');
  //         done();
  //       });
  //     });
  //   });

  //   context(
  //     'Disabling background jobs stops them from sending network requests',
  //     () => {
  //       it('Should begin a background task for outbound relay which is stopped when disableOutboundRelay is called', async () => {
  //         let callCount = 0;
  //         nock('https://api.evervault.com')
  //           .get('/v2/relay-outbound')
  //           .reply(200, () => {
  //             callCount++;
  //             return { outboundDestinations: [] };
  //           })
  //           .persist();
  //         const client = new EvervaultClient(testAppId, testApiKey);
  //         await client.enableOutboundRelay();
  //         await new Promise((resolve) =>
  //           setTimeout(resolve, client.config.http.pollInterval * 2 * 1000)
  //         );
  //         const currentCallCount = callCount;
  //         client.disableOutboundRelay();
  //         await new Promise((resolve) =>
  //           setTimeout(resolve, client.config.http.pollInterval * 2 * 1000)
  //         );
  //         nock.cleanAll();
  //         // no more requests sent after disabling OutboundRelay background job
  //         return expect(currentCallCount).to.equal(callCount);
  //       });
  //     }
  //   );
  // });

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

    before(() => {
      const handlers = [
        {
          url: '/cages/key',
          method: 'GET',
          responseStatusCode: 200,
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: JSON.stringify({
            key: testCageKey,
            ecdhKey: testEcdhCageKey,
          }),
        },
      ];
      server = createServerTwo(handlers);
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
            key: testCageKey,
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
      server = createServerTwo(handlers);
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
            key: testCageKey,
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
      server = createServerTwo(handlers);
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
            key: testCageKey,
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
      server = createServerTwo(handlers);
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

      targetServer = createServerTwo(targetHandlers);

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

      apiServer = createServerTwo(apiHandlers);

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

      const response = await phin(
        `http://localhost:${targetServer.address().port}`
      );

      const responseJson = JSON.parse(response.body);
      expect(responseJson.success).to.be.true;
    });
  });
});
