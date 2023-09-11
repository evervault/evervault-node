const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const nock = require('nock');
const sinon = require('sinon');
const phin = require('phin');
const https = require('https');
const rewire = require('rewire');
const { RelayOutboundConfig } = require('../lib/core');
const { errors } = require('../lib/utils');
const { ForbiddenIPError, DecryptError } = require('../lib/utils/errors');
const fixtures = require('./utilities/fixtures');

const cageName = 'test-cage',
  testData = { a: 1 };
const testCageKey = 'im-the-cage-key';
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
        expect(prepareSdkImport()).to.throw(errors.InitializationError);
      });
    });

    context('An object is provided instead of an api key', () => {
      it('throws an error', () => {
        expect(prepareSdkImport({})).to.throw(errors.InitializationError);
      });
    });

    context('An invalid App ID is provided', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('ev:key:')).to.throw(
          errors.InitializationError
        );
      });
    });

    context('No api key provided', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('app_id')).to.throw(errors.InitializationError);
      });
    });

    context('An API key is provided but does not belong to the app', () => {
      it('throws an error', () => {
        expect(prepareSdkImport('app_098765432121', testApiKey)).to.throw(
          errors.InitializationError
        );
      });
    });

    context('An api key and an app id is provided', () => {
      it('returns an sdk object', () => {
        const sdk = new EvervaultClient(testAppId, testApiKey);
        expect(sdk.encrypt).to.be.a('function');
        expect(sdk.run).to.be.a('function');
        expect(sdk.encryptAndRun).to.be.a('function');
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
            expect(err).to.be.instanceOf(errors.ApiKeyError);
            expect(encryptStub).to.not.have.been.called;
          });
        });
      });

      context('getCageKey succeeds', () => {
        let cageKeyNock;
        beforeEach(() => {
          cageKeyNock = nock(sdk.config.http.baseUrl, {
            reqheaders: {
              'API-KEY': testApiKey,
            },
          })
            .get('/cages/key')
            .reply(200, { key: testCageKey, ecdhKey: testEcdhCageKey });
          encryptStub.resolves({
            data: 'yes',
          });
        });
      });

      context('multiple encrypt calls', () => {
        const httpStub = sinon.stub();
        const getCageKeyStub = sinon.stub();
        let sdk;
        before(() => {
          getCageKeyStub.resolves({ key: testCageKey });
          httpStub.returns({ getCageKey: getCageKeyStub });
          encryptStub.resolves({
            data: 'yes',
          });
          EvervaultClient.__set__({
            Http: httpStub,
          });
          sdk = new EvervaultClient(testAppId, testApiKey);
        });
      });
    });

    context('Invoking run', () => {
      let runNock, sdk, testRunResult;

      beforeEach(() => {
        sdk = new EvervaultClient(testAppId, testApiKey);
      });

      context('Cage run with no options', () => {
        beforeEach(() => {
          testRunResult = {
            data: 'yes',
          };
          runNock = nock(sdk.config.http.functionRunUrl, {
            reqheaders: sdk.config.http.headers,
          })
            .post(`/${cageName}`)
            .reply(200, { result: testRunResult });
        });

        it('Calls the cage run api', () => {
          return sdk.run(cageName, testData).then((result) => {
            expect(result).to.deep.equal({ result: testRunResult });
            expect(runNock.isDone()).to.be.true;
          });
        });
      });

      context('Cage run with options', () => {
        beforeEach(() => {
          testRunResult = {
            status: 'queued',
          };
          runNock = nock(sdk.config.http.functionRunUrl, {
            reqheaders: {
              ...sdk.config.http.headers,
              'x-async': 'true',
              'x-version-id': '3',
            },
          })
            .post(`/${cageName}`)
            .reply(200, Buffer.alloc(0));
        });

        it('Calls the cage run api', () => {
          return sdk
            .run(cageName, testData, { async: true, version: 3 })
            .then((result) => {
              expect(result).to.deep.equal(Buffer.alloc(0));
              expect(runNock.isDone()).to.be.true;
            });
        });
      });

      context('Cage run receiving 403', () => {
        beforeEach(() => {
          runNock = nock(sdk.config.http.functionRunUrl, {
            reqheaders: {
              ...sdk.config.http.headers,
            },
          })
            .post(`/${cageName}`)
            .reply(
              403,
              { error: 'forbidden address' },
              { 'x-evervault-error-code': 'forbidden-ip-error' }
            );
        });

        it('Calls the cage run api and throws a forbidden ip error', () => {
          return sdk.run(cageName, testData).catch((err) => {
            expect(runNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(ForbiddenIPError);
          });
        });
      });

      context('Cage run receiving 422', () => {
        beforeEach(() => {
          testRunResult = {
            status: 'queued',
          };
          runNock = nock(sdk.config.http.functionRunUrl, {
            reqheaders: {
              ...sdk.config.http.headers,
            },
          })
            .post(`/${cageName}`)
            .reply(422, { error: 'decrypt failed' });
        });

        it('Calls the cage run api and throws a decrypt failed error', () => {
          return sdk
            .run(cageName, testData, { async: true, version: 3 })
            .catch((err) => {
              expect(runNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(DecryptError);
            });
        });
      });
    });

    context('Invoking encryptAndRun', () => {
      const httpStub = sinon.stub();
      const getCageKeyStub = sinon.stub();
      const runCageStub = sinon.stub();
      const getRelayOutboundConfigStub = sinon.stub();
      const testEncryptResult = {
        data: 'yes',
      };
      let sdk;

      beforeEach(() => {
        getCageKeyStub.resolves({ key: testCageKey });
        runCageStub.resolves({ result: true });
        httpStub.returns({
          getCageKey: getCageKeyStub,
          runCage: runCageStub,
          getRelayOutboundConfig: getRelayOutboundConfigStub,
        });
        encryptStub.resolves(testEncryptResult);
        EvervaultClient.__set__({
          Http: httpStub,
        });
        sdk = new EvervaultClient(testAppId, testApiKey);
      });

      afterEach(() => {
        getCageKeyStub.resetHistory();
        runCageStub.resetHistory();
        encryptStub.resetHistory();
        getRelayOutboundConfigStub.resetHistory();
      });
    });

    context('Testing outbound decryption', () => {
      const originalRequest = https.request;

      const wasProxied = (request, apiKey) => {
        return request.req.headers['proxy-authorization'] === apiKey;
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

        const response = await phin('https://destination1.evervault.test');
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

        const response = await phin('https://destination1.evervault.test');
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

        const response = await phin('https://destination1.evervault.io');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it("Doesn't proxy when intercept is false", async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          intercept: false,
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await phin('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.false;
      });

      it('Proxies all when intercept is true', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          intercept: true,
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await phin('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies all when ignoreDomains is present', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          ignoreDomains: [''],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await phin('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies domain included in decryptionDomains (constructor)', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          decryptionDomains: ['destination1.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await phin('https://destination1.evervault.test');
        expect(wasProxied(response, testApiKey)).to.be.true;
      });

      it('Proxies a wildcard domain included in decryptionDomains (constructor)', async () => {
        const client = new EvervaultClient(testAppId, testApiKey, {
          decryptionDomains: ['*.evervault.test'],
        });

        nockrandom = nock('https://destination1.evervault.test', {})
          .get('/')
          .reply(200, { success: true });

        const response = await phin('https://destination1.evervault.test');
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

        const response = await phin('https://destination1.evervault.test');
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

        const response = await phin('https://destination1.evervault.test');
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

        const response = await phin('https://destination1.evervault.test');
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
  });
});
