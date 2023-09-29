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

  const setupNock = (
    url = testValidConfig.baseUrl,
    apiKey = testApiKey,
    basic = false
  ) => {
    if (basic) {
      return nock(url, {
        reqheaders: {
          Authorization: `Basic ${Buffer.from(
            `${testAppId}:${apiKey}`
          ).toString('base64')}`,
        },
      });
    } else {
      return nock(url, {
        reqheaders: {
          'API-KEY': apiKey,
        },
      });
    }
  };

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

          it('It does not get the cage key with the api key', () => {
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
      context('should retry on 503', () => {
        let getCageKeyNock;
        const testResponse = { test: 'response' };
        before(() => {
          getCageKeyNock = setupNock()
            .get('/cages/key')
            .reply(502)
            .get('/cages/key')
            .reply(200, testResponse);
        });
        it('returns the cage key after retry', () => {
          return testHttpClient.getCageKey().then((res) => {
            expect(getCageKeyNock.isDone()).to.be.true;
            expect(res).to.deep.equal(testResponse);
          });
        });
      });
      context('should error after exhausting retries', () => {
        let getCageKeyNock;
        before(() => {
          getCageKeyNock = setupNock().get('/cages/key').reply(503);
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

  describe('runFunction', () => {
    const testFunction = 'my-magic-function';
    context('Function run succeeds', () => {
      const testResponse = {
        id: 'func_run_b470a269a369',
        result: { test: 'data' },
        status: 'success',
      };
      let runFunctionNock;
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(200, testResponse);
      });
      it('It receives the expected response', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((res) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(res.body).to.deep.equal(testResponse);
          });
      });
    });

    context('Function run fails', () => {
      let runFunctionNock;
      const testResponse = {
        error: { message: 'Uh oh!', stack: 'Error: Uh oh!...' },
        id: 'func_run_e4f1d8d83ec0',
        status: 'failure',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(200, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.FunctionRuntimeError);
            expect(err.message).to.equal(testResponse.error.message);
          });
      });
    });

    context('Function initialization fails', () => {
      let runFunctionNock;
      const testResponse = {
        error: {
          message: 'The function failed to initialize...',
          stack: 'JavaScript Error',
        },
        id: 'func_run_8c70a47efcb4',
        status: 'failure',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(200, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.FunctionInitializationError);
            expect(err.message).to.equal(testResponse.error.message);
          });
      });
    });

    context('Invalid Request', () => {
      let runFunctionNock;
      const testResponse = {
        status: 400,
        code: 'invalid-request',
        title: 'InvalidRequest',
        detail: 'The provided action was invalid',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(400, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.RequestError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('Unauthorized', () => {
      let runFunctionNock;
      const testResponse = {
        status: 401,
        code: 'unauthorized',
        title: 'Unauthorized',
        detail:
          'The request cannot be authenticated. The request does not contain valid credentials. Please retry with a valid API key.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(401, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.UnauthorizedError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('Forbidden', () => {
      let runFunctionNock;
      const testResponse = {
        status: 403,
        code: 'forbidden',
        title: 'Forbidden',
        detail:
          'The API key does not have the required permissions. API key permissions can be updated in the Evervault Dashboard.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(403, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.ForbiddenError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('Forbidden', () => {
      let runFunctionNock;
      const testResponse = {
        status: 403,
        code: 'function/forbidden-ip',
        title: 'Forbidden IP',
        detail: 'Run requested by an IP address which is not whitelisted.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(403, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.ForbiddenIPError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('ResourceNotFound', () => {
      let runFunctionNock;
      const testResponse = {
        status: 404,
        code: 'resource-not-found',
        title: 'Resource Not Found',
        detail: 'The resource /functions/world-hello was not found.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(404, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.FunctionNotFoundError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('RequestTimeout', () => {
      let runFunctionNock;
      const testResponse = {
        status: 408,
        code: 'request-timeout',
        title: 'Request Timeout',
        detail:
          'Function execution exceeded the allotted time and has timed out. Please review your code to ensure it finishes within the time limit set in function.toml.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(408, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.FunctionTimeoutError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('FunctionNotReady', () => {
      let runFunctionNock;
      const testResponse = {
        status: 409,
        code: 'function-not-ready',
        title: 'Function Not Ready',
        detail:
          "The Function is not ready to be invoked yet. This can occur when it hasn't been executed in a while. Retrying to run the Function after a short time should resolve this.",
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(409, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.FunctionNotReadyError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('UnprocessableContent', () => {
      let runFunctionNock;
      const testResponse = {
        status: 422,
        code: 'unprocessable-content',
        title: 'Unprocessable Content',
        detail: 'Unable to decrypt data.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(422, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.DecryptError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });

    context('InternalServerError', () => {
      let runFunctionNock;
      const testResponse = {
        status: 500,
        code: 'internal-server-error',
        title: 'Internal Server Error',
        detail:
          'An internal error occurred. For additional assistance, please contact support@evervault.com.',
      };
      before(() => {
        runFunctionNock = setupNock(
          'https://api.evervault.com',
          testApiKey,
          true
        )
          .post(`/functions/${testFunction}/runs`)
          .reply(500, testResponse);
      });
      it('It throws an error', () => {
        return testHttpClient
          .runFunction(testFunction, { test: 'data' })
          .then((_) => {
            expect.fail('Expected an error to be thrown');
          })
          .catch((err) => {
            expect(runFunctionNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.EvervaultError);
            expect(err.message).to.equal(testResponse.detail);
          });
      });
    });
  });

  describe('createRunToken', () => {
    context('Given an api key', () => {
      const testFunction = 'my-magic-function';
      context('Request is successful', () => {
        const testResponse = { test: 'data' };
        let createRunTokenNock;
        before(() => {
          createRunTokenNock = setupNock('https://api.evervault.com')
            .post(`/v2/functions/${testFunction}/run-token`)
            .reply(200, testResponse);
        });
        it('It posts to the function name with the api key', () => {
          return testHttpClient
            .createRunToken(testFunction, { test: 'data' })
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
            .post(`/v2/functions/${testFunction}/run-token`)
            .reply(404, testResponse);
        });
        it('It throws an error', () => {
          return testHttpClient
            .createRunToken(testFunction, { test: 'data' })
            .then((res) => {
              expect(createRunTokenNock.isDone()).to.be.true;
              expect(res.statusCode).to.equal(404);
              expect(res.body).to.deep.equal(testResponse);
            });
        });
      });
    });
  });

  describe('createClientSideDecryptToken', () => {
    context('Given an api key', () => {
      context('Request is successful', () => {
        const testResponse = { token: 'token', expiry: 1234, createdAt: 123 };
        let createRunTokenNock;
        before(() => {
          createRunTokenNock = setupNock(
            'https://api.evervault.com',
            testApiKey,
            true
          )
            .post(`/client-side-tokens`)
            .reply(200, testResponse);
        });
        it('It creates a token', () => {
          return testHttpClient.createToken({ test: 'data' }).then((res) => {
            expect(createRunTokenNock.isDone()).to.be.true;
            expect(res).to.deep.equal({
              ...testResponse,
              expiry: new Date(testResponse.expiry),
              createdAt: new Date(testResponse.createdAt),
            });
          });
        });
      });

      context('Request fails', () => {
        let createRunTokenNock;
        const testResponse = { errorType: 'NotFound' };
        before(() => {
          createRunTokenNock = setupNock(
            'https://api.evervault.com',
            testApiKey,
            true
          )
            .post(`/client-side-tokens`)
            .reply(400, '{"error": "Request is not valid"}');
        });
        it('It throws an error', () => {
          return testHttpClient.createToken({ test: 'data' }).catch((err) => {
            expect(createRunTokenNock.isDone()).to.be.true;
            expect(err).to.be.instanceOf(errors.RequestError);
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
