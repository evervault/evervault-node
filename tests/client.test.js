const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const nock = require('nock');
const sinon = require('sinon');

const rewire = require('rewire');
const EvervaultClient = rewire('../lib');
const encryptStub = sinon.stub();
EvervaultClient.__set__({
  Crypto: () => ({
    encrypt: encryptStub,
  }),
});
const { errors } = require('../lib/utils');

const cageName = 'test-cage',
  testData = { a: 1 };
const testCageKey = 'im-the-cage-key';
const testApiKey = 'test-api-key';

const prepareSdkImport = (...args) => () => {
  return new EvervaultClient(...args);
};

describe('Initialising the sdk', () => {
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
          .reply(200, { key: testCageKey });
        encryptStub.resolves({
          data: 'yes'
        });
      });

      it('Calls encrypt with the returned key', () => {
        return sdk.encrypt(testData).then(() => {
          expect(cageKeyNock.isDone()).to.be.true;
          expect(encryptStub).to.have.been.calledWith(
            `-----BEGIN PUBLIC KEY-----\n${testCageKey}\n-----END PUBLIC KEY-----`,
            testData,
            {}
          );
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
          data: 'yes'
        });
        EvervaultClient.__set__({
          Http: httpStub,
        });
        sdk = new EvervaultClient(testApiKey);
      });

      it('Only requests the key once', async () => {
        await sdk.encrypt(testData);

        return sdk.encrypt(testData).then(() => {
          expect(getCageKeyStub).to.have.been.calledOnce;
          expect(encryptStub).to.always.have.been.calledWith(
            `-----BEGIN PUBLIC KEY-----\n${testCageKey}\n-----END PUBLIC KEY-----`,
            testData,
            {}
          );
        });
      });
    });
  });

  context('Invoking encryptAndRun', () => {
    const httpStub = sinon.stub();
    const getCageKeyStub = sinon.stub();
    const runCageStub = sinon.stub();
    const testEncryptResult = {
      data: 'yes'
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

    context('First encryption call to sdk', () => {
      it('Calls getCageKey, encrypts the data and runs the cage', () => {
        return sdk.encryptAndRun(cageName, testData).then(() => {
          expect(getCageKeyStub).to.have.been.calledOnce;
          expect(encryptStub).to.have.been.calledOnceWith(
            `-----BEGIN PUBLIC KEY-----\n${testCageKey}\n-----END PUBLIC KEY-----`,
            testData,
            {}
          );
          expect(runCageStub).to.have.been.calledOnceWith(
            cageName,
            testEncryptResult
          );
        });
      });
    });
  });
});
