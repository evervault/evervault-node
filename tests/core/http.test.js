const chai = require('chai');
chai.use(require('chai-nock'));
const { expect } = chai;
const nock = require('nock');

describe('HttpClient', () => {
  const testApikey = 'api-key';
  const testValidConfig = require('../../lib/config')(testApikey).http;
  const testHttpClient = require('../../lib/core/http')(testValidConfig);

  after(() => {
    nock.restore();
  });

  describe('getCageKey', () => {
    context('Given an api key', () => {
      context('Request is successful', () => {
        let getCageKeyNock;
        const testResponse = { test: 'response' };
        before(() => {
          getCageKeyNock = nock(testValidConfig.baseUrl, {
            reqheaders: {
              'API-KEY': testApikey,
            },
          })
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
        let getCageKeyNock;
        const testResponse = { errorType: 'NotFoundError' };
        before(() => {
          getCageKeyNock = nock(testValidConfig.baseUrl, {
            reqheaders: {
              'API-KEY': testApikey,
            },
          })
            .get('/cages/key')
            .reply(404, testResponse);
        });

        it('It gets the cage key with the api key', () => {
          return testHttpClient.getCageKey().then((res) => {
            expect(getCageKeyNock.isDone()).to.be.true;
            expect(res).to.deep.equal(testResponse);
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
          runCageNock = nock(testValidConfig.baseUrl, {
            reqheaders: {
              'API-KEY': testApikey,
            },
          })
            .post(`/cages/${testCage}`)
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
          runCageNock = nock(testValidConfig.baseUrl, {
            reqheaders: {
              'API-KEY': testApikey,
            },
          })
            .post(`/cages/${testCage}`)
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
});
