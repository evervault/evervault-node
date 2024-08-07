const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const nock = require('nock');
const sinon = require('sinon');
const axios = require('axios');
const https = require('https');
const rewire = require('rewire');
const { RelayOutboundConfig } = require('../lib/core');
const { errors } = require('../lib/utils');
const fixtures = require('./utilities/fixtures');

const functionName = 'test-function',
  testData = { a: 1 };
const testCageKey = 'im-the-function-key';
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';
const testApiKey =
  'ev:key:1:3bOqOkKrVFrk2Ps9yM1tHEi90CvZCjsGIihoyZncM9SdLoXQxknPPjwxiMLyDVYyX:cRhR9o:tCZFZV';
const testAppId = 'app_8022cc5a3073';

let EvervaultClient;
const encryptStub = sinon.stub();
describe('Testing the Evervault SDK', () => {
  beforeEach(() => {
    EvervaultClient = rewire('../lib');
    EvervaultClient.__set__({
      Crypto: () => ({
        encrypt: encryptStub,
      }),
    });
  });

  afterEach(() => {
    encryptStub.reset();
  });

  context('Initialising the sdk', () => {
    const prepareSdkImport =
      (...args) =>
      () => {
        return new EvervaultClient(...args);
      };

    context('No api key provided', () => {
      it('throws an error', () => {
        expect(prepareSdkImport()).to.throw(errors.EvervaultError);
      });
    });

    context('An object is provided instead of an api key', () => {
      it('throws an error', () => {
        expect(prepareSdkImport({})).to.throw(errors.EvervaultError);
      });
    });

    context('An invalid App ID is provided', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('ev:key:')).to.throw(errors.EvervaultError);
      });
    });

    context('No api key provided', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('app_id')).to.throw(errors.EvervaultError);
      });
    });

    context('An API key is provided but does not belong to the app', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('app_098765432121', testApiKey)).to.throw(
          errors.EvervaultError
        );
      });
    });

    context('An api key and an app id is provided', () => {
      it('returns an sdk object', () => {
        const sdk = new EvervaultClient(testAppId, testApiKey);
        expect(sdk.encrypt).to.be.a('function');
        expect(sdk.run).to.be.a('function');
      });
    });

    context('Invoking returned encrypt', () => {
      let sdk;
      beforeEach(() => {
        sdk = new EvervaultClient(testAppId, testApiKey);
      });

      afterEach(() => {
        encryptStub.reset();
      });

      context('getCageKey fails', () => {
        let cageKeyNock;
        beforeEach(() => {
          cageKeyNock = nock(sdk.config.http.baseUrl, {
            reqheaders: {
              'API-KEY': testApiKey,
            },
          })
            .get('/cages/key')
            .reply(401, { errorMesage: 'error retrieving cage key' });
        });

        it('Throws an error', () => {
          return sdk.encrypt(testData).catch((err) => {
            expect(cageKeyNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.EvervaultError);
            expect(encryptStub).to.not.have.been.called;
          });
        });
      });
    });

    context('Invoking function run', () => {
      let runNock, sdk, testResponse;

      beforeEach(() => {
        sdk = new EvervaultClient(testAppId, testApiKey);
      });

      context('Function run succeeds', () => {
        beforeEach(() => {
          testResponse = {
            id: 'func_run_b470a269a369',
            result: { test: 'data' },
            status: 'success',
          };
          runNock = nock(sdk.config.http.baseUrl, {
            reqheaders: sdk.config.http.headers,
          })
            .post(`/functions/${functionName}/runs`)
            .reply(200, testResponse);
        });

        it('It receives the expected response', () => {
          return sdk.run(functionName, testData).then((result) => {
            expect(result).to.deep.equal(testResponse);
            expect(runNock.isDone()).to.be.true;
          });
        });
      });

      context('Function run fails', () => {
        beforeEach(() => {
          testResponse = {
            error: { message: 'Uh oh!', stack: 'Error: Uh oh!...' },
            id: 'func_run_e4f1d8d83ec0',
            status: 'failure',
          };
          runNock = nock(sdk.config.http.baseUrl, {
            reqheaders: sdk.config.http.headers,
          })
            .post(`/functions/${functionName}/runs`)
            .reply(200, testResponse);
        });

        it('It throws an error', () => {
          return sdk
            .run(functionName, testData)
            .then((_) => {
              expect.fail('Expected an error to be thrown');
            })
            .catch((err) => {
              expect(runNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(errors.FunctionRuntimeError);
              expect(err.message).to.equal(testResponse.error.message);
            });
        });
      });

      context('Function initialization fails', () => {
        beforeEach(() => {
          testResponse = {
            error: {
              message: 'The function failed to initialize...',
              stack: 'JavaScript Error',
            },
            id: 'func_run_8c70a47efcb4',
            status: 'failure',
          };
          runNock = nock(sdk.config.http.baseUrl, {
            reqheaders: sdk.config.http.headers,
          })
            .post(`/functions/${functionName}/runs`)
            .reply(200, testResponse);
        });

        it('It throws an error', () => {
          return sdk
            .run(functionName, testData)
            .then((_) => {
              expect.fail('Expected an error to be thrown');
            })
            .catch((err) => {
              expect(runNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(errors.FunctionRuntimeError);
              expect(err.message).to.equal(testResponse.error.message);
            });
        });
      });

      context('Error thrown by API', () => {
        beforeEach(() => {
          testResponse = {
            status: 401,
            code: 'unauthorized',
            title: 'Unauthorized',
            detail:
              'The request cannot be authenticated. The request does not contain valid credentials. Please retry with a valid API key.',
          };
          runNock = nock(sdk.config.http.baseUrl, {
            reqheaders: sdk.config.http.headers,
          })
            .post(`/functions/${functionName}/runs`)
            .reply(401, testResponse);
        });

        it('It throws an error', () => {
          return sdk
            .run(functionName, testData)
            .then((_) => {
              expect.fail('Expected an error to be thrown');
            })
            .catch((err) => {
              expect(runNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(errors.EvervaultError);
              expect(err.message).to.equal(testResponse.detail);
            });
        });
      });
    });

    context('Testing outbound decryption', () => {
      const originalRequest = https.request;

      const wasProxied = (request, apiKey) => {
        return request.request.headers['proxy-authorization'] === apiKey;
      };

      afterEach(() => {
        https.request = originalRequest;
        RelayOutboundConfig.clearCache();
        RelayOutboundConfig.disablePolling();
      });

      it('Proxies when outbound relay is enabled', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        relayOutboundConfigNock = nock(client.config.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/v2/relay-outbound')
          .reply(200, fixtures.relayOutboundResponse.data);
        await client.enableOutboundRelay();

        nockrandom = nock('https://destination1.evervault.test', {
          reqheaders: {
            'Proxy-Authorization': testApiKey,
          },
        })
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies when outbound relay is enabled and debugRequests option is present', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        relayOutboundConfigNock = nock(client.config.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/v2/relay-outbound')
          .reply(200, fixtures.relayOutboundResponse.data);
        await client.enableOutboundRelay({ debugRequests: true });

        nockrandom = nock('https://destination1.evervault.test', {
          reqheaders: {
            'Proxy-Authorization': testApiKey,
          },
        })
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies when outbound relay is enabled and a wildcard domain is included in the config', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        relayOutboundConfigNock = nock(client.config.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/v2/relay-outbound')
          .reply(200, fixtures.relayOutboundResponse.data);
        await client.enableOutboundRelay();

        nockrandom = nock('https://destination1.evervault.io', {
          reqheaders: {
            'Proxy-Authorization': testApiKey,
          },
        })
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.io');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies domain included in decryptionDomains (constructor)', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          decryptionDomains: ['destination1.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies a wildcard domain included in decryptionDomains (constructor)', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          decryptionDomains: ['*.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies domain included in decryptionDomains', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        await client.enableOutboundRelay({
          decryptionDomains: ['destination1.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies domain included in decryptionDomains and debugRequests option is present', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        await client.enableOutboundRelay({
          decryptionDomains: ['destination1.evervault.test'],
          debugRequests: true,
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies a wildcard domain included in decryptionDomains', async () => {
        const client = new EvervaultClient(testAppId, testApiKey);
        await client.enableOutboundRelay({
          decryptionDomains: ['*.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await axios('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Should throw an exception if outbound relay failed to be enabled', (done) => {
        const client = new EvervaultClient(testAppId, testApiKey);
        relayOutboundConfigNock = nock(client.config.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/v2/relay-outbound')
          .reply(500, fixtures.relayOutboundResponse.data);
        client.enableOutboundRelay().catch((err) => {
          expect(err).to.be.an('error');
          done();
        });
      });
    });

    context(
      'Disabling background jobs stops them from sending network requests',
      () => {
        it('Should begin a background task for outbound relay which is stopped when disableOutboundRelay is called', async () => {
          let callCount = 0;
          nock('https://api.evervault.com')
            .get('/v2/relay-outbound')
            .reply(200, () => {
              callCount++;
              return { outboundDestinations: [] };
            })
            .persist();
          const client = new EvervaultClient(testAppId, testApiKey);
          await client.enableOutboundRelay();
          await new Promise((resolve) =>
            setTimeout(resolve, client.config.http.pollInterval * 2 * 1000)
          );
          const currentCallCount = callCount;
          client.disableOutboundRelay();
          await new Promise((resolve) =>
            setTimeout(resolve, client.config.http.pollInterval * 2 * 1000)
          );
          nock.cleanAll();
          // no more requests sent after disabling OutboundRelay background job
          return expect(currentCallCount).to.equal(callCount);
        });
      }
    );
  });
});
