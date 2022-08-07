const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const nock = require('nock');
const sinon = require('sinon');
const phin = require('phin');
const https = require('https');

const rewire = require('rewire');
const { errors } = require('../lib/utils');
const { ForbiddenIPError, DecryptError } = require('../lib/utils/errors');

const cageName = 'test-cage',
  testData = { a: 1 };
const testCageKey = 'im-the-cage-key';
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';
const testApiKey = 'test-api-key';

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

    context('An api key is provided', () => {
      it('returns an sdk object', () => {
        const sdk = new EvervaultClient('my-api-key');
        expect(sdk.encrypt).to.be.a('function');
        expect(sdk.run).to.be.a('function');
        expect(sdk.encryptAndRun).to.be.a('function');
      });
    });

    context('Invoking returned encrypt', () => {
      let sdk;
      beforeEach(() => {
        sdk = new EvervaultClient(testApiKey);
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
          sdk = new EvervaultClient(testApiKey);
        });
      });
    });

    context('Invoking run', () => {
      let runNock, sdk, testRunResult;

      beforeEach(() => {
        sdk = new EvervaultClient(testApiKey);
      });

      context('Cage run with no options', () => {
        beforeEach(() => {
          testRunResult = {
            data: 'yes',
          };
          runNock = nock(sdk.config.http.cageRunUrl, {
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
          runNock = nock(sdk.config.http.cageRunUrl, {
            reqheaders: {
              ...sdk.config.http.headers,
              'x-async': 'true',
              'x-version-id': '3',
            },
          })
            .post(`/${cageName}`)
            .reply(200, { result: testRunResult });
        });

        it('Calls the cage run api', () => {
          return sdk
            .run(cageName, testData, { async: true, version: 3 })
            .then((result) => {
              expect(result).to.deep.equal({ result: testRunResult });
              expect(runNock.isDone()).to.be.true;
            });
        });
      });

      context('Cage run receiving 403', () => {
        beforeEach(() => {
          runNock = nock(sdk.config.http.cageRunUrl, {
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
          runNock = nock(sdk.config.http.cageRunUrl, {
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
      const testEncryptResult = {
        data: 'yes',
      };
      let sdk;

      beforeEach(() => {
        getCageKeyStub.resolves({ key: testCageKey });
        runCageStub.resolves({ result: true });
        httpStub.returns({ getCageKey: getCageKeyStub, runCage: runCageStub });
        encryptStub.resolves(testEncryptResult);
        EvervaultClient.__set__({
          Http: httpStub,
        });
        sdk = new EvervaultClient(testApiKey);
      });

      afterEach(() => {
        getCageKeyStub.resetHistory();
        runCageStub.resetHistory();
        encryptStub.resetHistory();
      });
    });

    context('Testing outbound decryption', () => {
      const test_url = 'https://evervault.com';
      const originalRequest = https.request;

      afterEach(() => {
        https.request = originalRequest;
      });

      const wasProxied = (result) => {
        return result.socket._parent
          ? result.socket._parent._host === 'relay.evervault.com'
          : false;
      };

      it("Doesn't proxy when no proxy args are set", () => {
        new EvervaultClient('testing');
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.false;
        });
      });

      it("Doesn't proxy when intercept is false", () => {
        new EvervaultClient('testing', { intercept: false });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.false;
        });
      });

      it('Proxies all when intercept is true', () => {
        new EvervaultClient('testing', { intercept: true });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.true;
        });
      });

      it('Proxies all when ignoreDomains is present', () => {
        new EvervaultClient('testing', { ignoreDomains: [''] });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.true;
        });
      });

      it("Doesn't proxy domain included in ignoreDomains", () => {
        new EvervaultClient('testing', { ignoreDomains: ['evervault.com'] });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.false;
        });
      });

      it('Proxies domain included in decryptionDomains', () => {
        new EvervaultClient('testing', {
          decryptionDomains: ['evervault.com'],
        });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.true;
        });
      });

      it('Proxies a wildcard domain included in decryptionDomains', () => {
        new EvervaultClient('testing', {
          decryptionDomains: ['*.evervault.com'],
        });
        return phin('https://app.evervault.com').then((result) => {
          expect(wasProxied(result)).to.be.true;
        });
      });

      it("Doesn't proxy domain not in decryptionDomains", () => {
        new EvervaultClient('testing', { decryptionDomains: [''] });
        return phin(test_url).then((result) => {
          expect(wasProxied(result)).to.be.false;
        });
      });
    });
  });
});
