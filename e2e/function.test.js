const { expect } = require('chai');
const axios = require('axios');
const Evervault = require('../lib');

describe('Functions', () => {
  const appUuid = process.env.EV_APP_UUID;
  const apiKey = process.env.EV_API_KEY;
  const functionName = process.env.EV_FUNCTION_NAME;
  const payload = {
    string: 'hello',
    integer: 1,
    float: 1.5,
    true: true,
    false: false,
    array: ['hello', 1, 1.5, true, false],
    obj: {
      hello: 'world',
    },
  };
  const expected_response = {
    string: 'string',
    integer: 'number',
    float: 'number',
    true: 'boolean',
    false: 'boolean',
    array: {
      0: 'string',
      1: 'number',
      2: 'number',
      3: 'boolean',
      4: 'boolean',
    },
    obj: { hello: 'string' },
  };

  let evervaultClient;

  beforeEach(() => {
    evervaultClient = new Evervault(appUuid, apiKey);
  });

  context('Function runs', () => {
    it('runs the function', async () => {
      const encrypted = await evervaultClient.encrypt(payload);

      const functionResponse = await evervaultClient.run(
        functionName,
        encrypted
      );
      expect(functionResponse.status).to.equal('success');
      expect(functionResponse.result).to.deep.equal(expected_response);
    });

    it('runs the function and returns the error object', async () => {
      const payload = {
        shouldError: true,
      };

      await evervaultClient
        .run(functionName, payload)
        .then(() => {
          expect.fail('Expected an error to be thrown');
        })
        .catch((error) => {
          expect(error.type).to.equal('FunctionRuntimeError');
          expect(error.message).to.equal('User threw an error');
        });
    });

    it('runs the function with a run token', async () => {
      const encrypted = await evervaultClient.encrypt(payload);
      const tokenResponse = await evervaultClient.createRunToken(
        functionName,
        encrypted
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const functionResponse = await axios.post(
        `https://api.evervault.com/functions/${functionName}/runs`,
        { payload: encrypted },
        {
          headers: {
            Authorization: `RunToken ${tokenResponse.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      expect(functionResponse.data.status).to.equal('success');
      expect(functionResponse.data.result).to.deep.equal(expected_response);
    });
  });
});
