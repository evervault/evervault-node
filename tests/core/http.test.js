const { expect } = require('chai');
const { errors } = require('../../lib/utils');
const nock = require('nock');

describe('Http Module', () => {
  const testApiKey =
    'ev:key:1:3bOqOkKrVFrk2Ps9yM1tHEi90CvZCjsGIihoyZncM9SdLoXQxknPPjwxiMLyDVYyX:cRhR9o:tCZFZV';
  const testAppId = 'app_8022cc5a3073';
  const testValidConfig = require('../../lib/config')().http;
  const testHttpClient = require('../../lib/core/http')(
    testAppId,
    testApiKey,
    testValidConfig
  );

  const setupNock = (url = testValidConfig.baseUrl, apiKey = testApiKey) =>
    nock(url, {
      reqheaders: {
        'API-KEY': apiKey,
      },
    });

  after(() => {
    nock.restore();
  });

  describe('getCageKey', () => {
    context('Given an api key', () => {
      context('Request is successful', () => {
        let getCageKeyNock;
        const testResponse = { test: 'response' };
        before(() => {
          getCageKeyNock = setupNock()
            .get('/cages/key')
            .reply(200, testResponse);
        });

        it('It gets the cage key with the api key', () => {
          return testHttpClient.getCageKey().then((res) => {
            expect(getCageKeyNock.isDone()).to.be.true;
            expect(res).to.deep.equal(testResponse);
          });
        });
      });
      context('Request fails', () => {
        context('Response is a 401', () => {
          let getCageKeyNock;
          const testResponse = { errorType: 'Unauthorized' };
          before(() => {
            getCageKeyNock = setupNock()
              .get('/cages/key')
              .reply(401, testResponse);
          });

          it('It gets the cage key with the api key', () => {
            return testHttpClient.getCageKey().catch((err) => {
              expect(getCageKeyNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(errors.ApiKeyError);
            });
          });
        });
      });
      context('Request throws an error', () => {
        let getCageKeyNock;
        before(() => {
          getCageKeyNock = setupNock()
            .get('/cages/key')
            .replyWithError('An error occurred');
        });
        it('Throws a CageKeyError', () => {
          return testHttpClient.getCageKey().catch((err) => {
            expect(getCageKeyNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.CageKeyError);
          });
        });
      });
    });
  });

  describe('runCage', () => {
    context('Given an api key', () => {
      const testCage = 'my-magic-cage';
      context('Request is successful', () => {
        const testResponse = { test: 'data' };
        let runCageNock;
        before(() => {
          runCageNock = setupNock('https://run.evervault.com')
            .post(`/${testCage}`)
            .reply(200, testResponse);
        });
        it('It posts to the cage name with the api key', () => {
          return testHttpClient
            .runCage(testCage, { test: 'data' })
            .then((res) => {
              expect(runCageNock.isDone()).to.be.true;
              expect(res.body).to.deep.equal(testResponse);
            });
        });
      });

      context('Request fails', () => {
        let runCageNock;
        const testResponse = { errorType: 'NotFound' };
        before(() => {
          runCageNock = setupNock('https://run.evervault.com')
            .post(`/${testCage}`)
            .reply(404, testResponse);
        });
        it('It throws an error', () => {
          return testHttpClient
            .runCage(testCage, { test: 'data' })
            .then((res) => {
              expect(runCageNock.isDone()).to.be.true;
              expect(res.statusCode).to.equal(404);
              expect(res.body).to.deep.equal(testResponse);
            });
        });
      });
    });
  });

  describe('createRunToken', () => {
    context('Given an api key', () => {
      const testCage = 'my-magic-cage';
      context('Request is successful', () => {
        const testResponse = { test: 'data' };
        let createRunTokenNock;
        before(() => {
          createRunTokenNock = setupNock('https://api.evervault.com')
            .post(`/v2/functions/${testCage}/run-token`)
            .reply(200, testResponse);
        });
        it('It posts to the cage name with the api key', () => {
          return testHttpClient
            .createRunToken(testCage, { test: 'data' })
            .then((res) => {
              expect(createRunTokenNock.isDone()).to.be.true;
              expect(res.body).to.deep.equal(testResponse);
            });
        });
      });

      context('Request fails', () => {
        let createRunTokenNock;
        const testResponse = { errorType: 'NotFound' };
        before(() => {
          createRunTokenNock = setupNock('https://api.evervault.com')
            .post(`/v2/functions/${testCage}/run-token`)
            .reply(404, testResponse);
        });
        it('It throws an error', () => {
          return testHttpClient
            .createRunToken(testCage, { test: 'data' })
            .then((res) => {
              expect(createRunTokenNock.isDone()).to.be.true;
              expect(res.statusCode).to.equal(404);
              expect(res.body).to.deep.equal(testResponse);
            });
        });
      });
    });
  });

  describe('getRelayOutboundConfig', () => {
    context('Given an api key', () => {
      context('Request is successful', () => {
        let getRelayOutboundConfigNock;
        const testResponse = { test: 'response' };
        it('It gets the relay outbound config with the api key', () => {
          getRelayOutboundConfigNock = setupNock()
            .get('/v2/relay-outbound')
            .reply(200, testResponse, {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=5, must-revalidate',
              'X-Poll-Interval': '5',
            });
          return testHttpClient.getRelayOutboundConfig().then((res) => {
            expect(getRelayOutboundConfigNock.isDone()).to.be.true;
            expect(res.pollInterval).to.equal(5);
            expect(res.data).to.deep.equal(testResponse);
          });
        });
        it('It gets the relay outbound config with the api key and the poll interval header in the response is not set', () => {
          getRelayOutboundConfigNock = setupNock()
            .get('/v2/relay-outbound')
            .reply(200, testResponse, {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=5, must-revalidate',
            });
          return testHttpClient.getRelayOutboundConfig().then((res) => {
            expect(getRelayOutboundConfigNock.isDone()).to.be.true;
            expect(res.pollInterval).to.equal(null);
            expect(res.data).to.deep.equal(testResponse);
          });
        });
        it('It gets the relay outbound config with the api key and the poll interval header in the response is invalid', () => {
          getRelayOutboundConfigNock = setupNock()
            .get('/v2/relay-outbound')
            .reply(200, testResponse, {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=5, must-revalidate',
            });
          return testHttpClient.getRelayOutboundConfig().then((res) => {
            expect(getRelayOutboundConfigNock.isDone()).to.be.true;
            expect(res.pollInterval).to.equal(null);
            expect(res.data).to.deep.equal(testResponse);
          });
        });
      });
      context('Request fails', () => {
        context('Response is a 401', () => {
          let getRelayOutboundConfigNock;
          const testResponse = { errorType: 'Unauthorized' };
          before(() => {
            getRelayOutboundConfigNock = setupNock()
              .get('/v2/relay-outbound')
              .reply(401, testResponse);
          });

          it('It gets the relay outbound config with the api key', () => {
            return testHttpClient.getRelayOutboundConfig().catch((err) => {
              expect(getRelayOutboundConfigNock.isDone()).to.be.true;
              expect(err).to.be.instanceOf(errors.ApiKeyError);
            });
          });
        });
      });
      context('Request throws an error', () => {
        let getRelayOutboundConfigNock;
        before(() => {
          getRelayOutboundConfigNock = setupNock()
            .get('/v2/relay-outbound')
            .replyWithError('An error occurred');
        });
        it('Throws a RelayOutboundConfig Error', () => {
          return testHttpClient.getRelayOutboundConfig().catch((err) => {
            expect(getRelayOutboundConfigNock.isDone()).to.be.true;
            console.error(err);
            expect(err).to.be.instanceOf(errors.RelayOutboundConfigError);
          });
        });
      });
    });
  });
});
